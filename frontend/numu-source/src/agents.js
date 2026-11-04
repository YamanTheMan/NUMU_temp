
import {
  stocks,
  sectors,
  lessons,
  terms,
  reasons,
  marketSnapshot
} from './data.js';

import {
  formatPercent,
  formatPrice,
  sectorMix
} from './model.js';

import { icon } from './icons.js';

const esc = v =>
  String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const sectorById = id => sectors.find(s => s.id === id);

const avg = arr =>
  arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

const sectorAvg = (id, key) =>
  avg(
    stocks
      .filter(s => s.sector === id)
      .map(s => s[key])
  );


// ============================================================
// AGENT DEFINITIONS
// ============================================================

export const agents = [
  {
    // Keep this ID as 'tutor' for the OpenAI integration.
    id: 'tutor',
    name: "Musa'id (مساعد)",
    icon: 'book',
    role:
      'Your AI investing chatbot. Ask anything in simple Arabic or English, with examples from Qatar.',
    prompts: [
      'What is dividend yield?',
      'Explain P/E like I’m new',
      'How does the QSE trading day work?',
      'What does T+2 mean?'
    ],
    live: true
  },
  {
    id: 'research',
    name: 'Company research',
    icon: 'search',
    role:
      'Explore QSE companies, understand how they earn money and learn what might affect their business.',
    prompts: [
      'Brief me on QNBK',
      'Brief me on Industries Qatar',
      'Brief me on Baladna',
      'Brief me on Nakilat'
    ],
    live: false
  },
  {
    id: 'coach',
    name: 'Pick coach',
    icon: 'target',
    role:
      'Reviews your challenge picks before you lock in. Asks questions, never picks for you.',
    prompts: [
      'Review my picks',
      'Is my mix diversified?',
      'What should I check before locking in?'
    ],
    live: false
  },
  {
    id: 'brief',
    name: 'Market brief',
    icon: 'sun',
    role:
      'A short summary of the sample market: index, movers, sectors and a word to learn.',
    prompts: [
      'Today’s market brief',
      'Biggest movers',
      'Which sector moved most?'
    ],
    live: false
  }
];


// ============================================================
// SHARED HELPERS
// ============================================================

const lessonAction = id => {
  const lesson = lessons.find(x => x.id === id);

  return lesson
    ? {
        label: `Lesson: ${lesson.title}`,
        action: 'open-lesson',
        id
      }
    : null;
};


function findStock(text) {
  const t = text.toLowerCase();

  return stocks.find(s =>
    t.includes(s.ticker.toLowerCase()) ||
    t.includes(
      s.name.toLowerCase().replace(/ \(.*\)/, '')
    ) ||
    (s.ticker === 'QGTS' && t.includes('nakilat')) ||
    (s.ticker === 'QNNS' && t.includes('milaha')) ||
    (s.ticker === 'QFLS' && t.includes('woqod'))
  );
}


// ============================================================
// DEMO TUTOR
// Backup only. Actual Musa'id uses OpenAI via app.js.
// ============================================================

function tutor(text) {
  const t = text.toLowerCase();

  if (/trading day|hours|open|close/.test(t)) {
    return {
      text:
        'The QSE trades Sunday to Thursday. Orders can go in from 9:00 AM, matching starts at 9:30 AM and continuous trading runs to 1:00 PM. A closing auction sets the official close at about 1:10 PM. That’s why challenge picks lock at 9:30.',
      actions: [lessonAction('meet-qse')].filter(Boolean)
    };
  }

  if (/p\/?e|price.to.earnings|earnings/.test(t)) {
    return {
      text:
        'P/E is the share price divided by yearly profit per share. If a share costs QAR 18 and earns QAR 1.80 a year per share, the P/E is 10: you pay 10 riyals for each riyal of profit. Low can mean cheap, or that people expect profit to fall. Compare within the same sector.',
      actions: [lessonAction('pe-ratio')].filter(Boolean)
    };
  }

  const term = terms.find(x =>
    t.includes(x.term.toLowerCase()) ||
    t.includes(x.term.toLowerCase().split(' ')[0])
  );

  if (term) {
    return {
      text: `${term.term}: ${term.meaning}`,
      actions: [lessonAction(term.lessonId)].filter(Boolean)
    };
  }

  const lesson = lessons.find(l =>
    l.title
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 4)
      .some(w => t.includes(w))
  );

  if (lesson) {
    return {
      text:
        `${lesson.summary} The short version: ${lesson.takeaway}`,
      actions: []
    };
  }

  return {
    text:
      'I can explain terms like dividend yield, P/E, tick size, T+2, the QE Index, diversification and the NIN.',
    actions: []
  };
}


// ============================================================
// COMPANY RESEARCH — DEMO VERSION
// Will later connect to the scheduled research backend.
// ============================================================

function research(text) {
  const s = findStock(text);

  if (!s) {
    return {
      text:
        'Tell me a company or ticker, like QNBK, Ooredoo or Baladna, and I’ll give you a brief.',
      actions: []
    };
  }

  const sec = sectorById(s.sector);

  if (!sec) {
    return {
      text: 'Company sector information is unavailable.',
      actions: []
    };
  }

  const peAvg = sectorAvg(s.sector, 'pe');
  const yAvg = sectorAvg(s.sector, 'yield');

  const peNote =
    s.pe < peAvg * 0.9
      ? 'below'
      : s.pe > peAvg * 1.1
        ? 'above'
        : 'close to';

  return {
    text: `
      <strong>${esc(s.name)} (${esc(s.ticker)})</strong>,
      ${esc(sec.short.toLowerCase())}.

      <br><br>

      <strong>What it does.</strong>
      ${esc(s.about)}

      <br>

      <strong>How it earns.</strong>
      ${esc(s.earns)}

      <br>

      <strong>What moves it.</strong>
      ${esc(s.watch)}

      <br><br>

      <strong>Sample numbers:</strong>
      Price QAR ${formatPrice(s.price)}
      (${formatPercent(s.change)} today),
      P/E ${s.pe.toFixed(1)},
      ${peNote} the
      ${esc(sec.short.toLowerCase())}
      average of ${peAvg.toFixed(1)}.

      Yield ${s.yield.toFixed(1)}%
      vs ${yAvg.toFixed(1)}% for the sector.

      <br><br>

      <strong>Questions worth asking:</strong>
      Why is its P/E ${peNote} its peers,
      and can profits keep paying that dividend?

      <br><br>

      <em>These figures are fictional demo values,
      not verified current market data.</em>
    `,
    html: true,
    actions: [
      {
        label: `Open ${s.ticker}`,
        action: 'stock',
        id: s.ticker
      },
      lessonAction(sec.lessonId)
    ].filter(Boolean)
  };
}


// ============================================================
// PICK COACH — DEMO VERSION
// ============================================================

function coach(text, state) {
  const picks = state.challenge.picks;

  if (!picks.length) {
    return {
      text:
        'You haven’t picked anything yet. Choose three stocks on the Compete page and I’ll review them with you before you lock in.',
      actions: [
        {
          label: 'Go to Compete',
          action: 'goto',
          id: 'compete'
        }
      ]
    };
  }

  const t = text.toLowerCase();
  const mix = sectorMix(picks);

  const list = picks
    .map(ticker =>
      stocks.find(s => s.ticker === ticker)
    )
    .filter(Boolean);

  if (/check|before/.test(t)) {
    return {
      text:
        'Before you lock in, ask yourself three things. 1) Do I know how each company makes money? 2) Are my picks driven by the same thing, like interest rates or oil prices? 3) Is my reason something I can check after the close? One day is mostly noise, so focus on reasoning you can learn from.',
      actions: [
        lessonAction('skill-vs-luck')
      ].filter(Boolean)
    };
  }

  const lines = list.map(s => {
    const sector = sectorById(s.sector);
    const peAvg = sectorAvg(s.sector, 'pe');

    const r = reasons.find(x =>
      x.id === state.challenge.reasons[s.ticker]
    );

    return `
      <li>
        <strong>${esc(s.ticker)}</strong>,
        ${esc(sector?.short?.toLowerCase() || 'unknown sector')}.

        P/E ${s.pe.toFixed(1)}
        vs sector ${peAvg.toFixed(1)}.

        ${
          r
            ? `Your reason: ${esc(r.label.toLowerCase())}.`
            : ''
        }
      </li>
    `;
  }).join('');

  const hunch = picks.some(ticker =>
    state.challenge.reasons[ticker] === 'hunch'
  );

  return {
    text: `
      Here’s what I see in your ${
        picks.length === 3
          ? 'three picks'
          : `${picks.length} pick${picks.length > 1 ? 's' : ''} so far`
      }:

      <ul>${lines}</ul>

      ${esc(mix.note || 'Add more picks to see your sector mix.')}

      ${
        hunch
          ? ' One pick is a hunch. Can you name a reason you could check after the close?'
          : ''
      }

      <br><br>

      I won’t tell you what to pick.
      That part is your call.
    `,
    html: true,
    actions: [
      mix.diversified
        ? null
        : lessonAction('diversify'),
      {
        label: 'Back to my picks',
        action: 'goto',
        id: 'compete'
      }
    ].filter(Boolean)
  };
}


// ============================================================
// MARKET BRIEF — DEMO VERSION
// ============================================================

function brief(text) {
  const t = text.toLowerCase();

  const bySector = sectors
    .map(s => ({
      ...s,
      move: avg(
        stocks
          .filter(x => x.sector === s.id)
          .map(x => x.change)
      )
    }))
    .sort((a, b) => b.move - a.move);

  const sorted = [...stocks].sort(
    (a, b) => b.change - a.change
  );

  if (/sector/.test(t)) {
    return {
      text:
        `Best sector in the sample data: ${bySector[0].short} at ${formatPercent(bySector[0].move)} on average. Weakest: ${bySector.at(-1).short} at ${formatPercent(bySector.at(-1).move)}.`,
      actions: [lessonAction('diversify')].filter(Boolean)
    };
  }

  if (/mover/.test(t)) {
    return {
      text:
        `Sample top gainers: ${sorted.slice(0, 3).map(s => `${s.ticker} ${formatPercent(s.change)}`).join(', ')}. Sample biggest fallers: ${sorted.slice(-3).reverse().map(s => `${s.ticker} ${formatPercent(s.change)}`).join(', ')}. These are demo figures, not current QSE movements.`,
      actions: [
        {
          label: `Open ${sorted[0].ticker}`,
          action: 'stock',
          id: sorted[0].ticker
        }
      ]
    };
  }

  const term =
    terms[Math.floor(Date.now() / 86400000) % terms.length];

  return {
    text: `
      <strong>Sample market brief.</strong>

      The ${esc(marketSnapshot.name)}
      is at ${marketSnapshot.value.toLocaleString('en-US', {
        minimumFractionDigits: 2
      })},
      ${formatPercent(marketSnapshot.change)}.

      <br>

      Leading sample sector:
      ${esc(bySector[0].short.toLowerCase())}
      (${formatPercent(bySector[0].move)}).

      <br>

      Lagging sample sector:
      ${esc(bySector.at(-1).short.toLowerCase())}
      (${formatPercent(bySector.at(-1).move)}).

      <br><br>

      Word of the day:
      <strong>${esc(term.term)}</strong>.
      ${esc(term.meaning)}

      <br><br>

      <em>Demo market figures only.
      Not a live market update.</em>
    `,
    html: true,
    actions: [
      lessonAction(term.lessonId),
      {
        label: 'Go to Compete',
        action: 'goto',
        id: 'compete'
      }
    ].filter(Boolean)
  };
}


// ============================================================
// AGENT RESPONSE ROUTER
// ============================================================

// app.js calls the OpenAI backend directly when
// agentId === 'tutor'.
//
// This function remains responsible for demo agents.

export function agentReply(agentId, text, state) {
  const fn = {
    tutor,
    research,
    coach,
    brief
  }[agentId] || tutor;

  return fn(text, state);
}


// ============================================================
// AGENTS PAGE
// ============================================================

export function renderAgents(state, ui) {
  const selectedAgent =
    agents.find(x => x.id === ui.agent) || agents[0];

  const chat = ui.chats[selectedAgent.id] || [];

  const statusText = selectedAgent.live
    ? 'AI-powered tutor'
    : 'Demo agent';

  return `
    <header class="page-head">
      <div>
        <h1>Agents</h1>
        <p class="lede">
          Financial learning assistants that explain,
          research and coach you.
          They never tell you what to buy.
        </p>
      </div>

      <span class="tag">
        ${icon('info', 14)}
        ${statusText}
      </span>
    </header>

    <div class="agents-layout">

      <!-- Agent selection sidebar -->
      <ul class="agent-list" role="list">
        ${agents.map(agent => `
          <li>
            <button
              class="agent-card ${
                agent.id === selectedAgent.id ? 'is-on' : ''
              }"
              data-action="agent-select"
              data-id="${esc(agent.id)}"
              aria-pressed="${
                agent.id === selectedAgent.id
              }"
            >
              <span class="agent-icon">
                ${icon(agent.icon, 22)}
              </span>

              <span>
                <strong>${esc(agent.name)}</strong>
                <small>${esc(agent.role)}</small>
              </span>
            </button>
          </li>
        `).join('')}
      </ul>

      <!-- Selected agent chat -->
      <section
        class="chat"
        aria-label="${esc(selectedAgent.name)} conversation"
      >

        <header class="chat-head">
          <span class="agent-icon">
            ${icon(selectedAgent.icon, 22)}
          </span>

          <div>
            <h2>${esc(selectedAgent.name)}</h2>
            <p>${esc(selectedAgent.role)}</p>
          </div>

          ${
            chat.length
              ? `
                <button
                  class="btn btn-ghost sm"
                  data-action="agent-clear"
                >
                  Clear
                </button>
              `
              : ''
          }
        </header>

        <!-- Messages -->
        <div
          class="chat-log"
          id="chat-log"
          aria-live="polite"
        >
          ${
            chat.length
              ? chat.map(message => {

                  // User message
                  if (message.from === 'you') {
                    return `
                      <div class="msg you">
                        ${esc(message.text)}
                      </div>
                    `;
                  }

                  // Agent is typing
                  if (message.typing) {
                    return `
                      <div class="msg agent typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    `;
                  }

                  // Agent reply
                  return `
                    <div class="msg agent">
                      ${
                        message.html
                          ? message.text
                          : esc(message.text)
                      }

                      ${
                        message.actions?.length
                          ? `
                            <div class="msg-actions">
                              ${message.actions.map(action => `
                                <button
                                  class="btn btn-ghost sm"
                                  data-action="${esc(action.action)}"
                                  data-id="${esc(action.id)}"
                                >
                                  ${esc(action.label)}
                                </button>
                              `).join('')}
                            </div>
                          `
                          : ''
                      }
                    </div>
                  `;

                }).join('')
              : `
                <div class="chat-empty">
                  ${icon(selectedAgent.icon, 30)}

                  <p>
                    ${
                      selectedAgent.id === 'tutor'
                        ? 'Ask Musa\'id anything about investing. You can speak English or Arabic.'
                        : selectedAgent.role
                    }
                  </p>
                </div>
              `
          }
        </div>

        <!-- Suggested questions -->
        <div class="prompts">
          ${selectedAgent.prompts.map(prompt => `
            <button
              class="chip"
              data-action="agent-prompt"
              data-id="${esc(prompt)}"
            >
              ${esc(prompt)}
            </button>
          `).join('')}
        </div>

        <!-- Chat input -->
        <form id="agent-form" class="chat-input">

          <label
            class="sr-only"
            for="agent-text"
          >
            Message ${esc(selectedAgent.name)}
          </label>

          <input
            id="agent-text"
            name="text"
            autocomplete="off"
            placeholder="Ask ${esc(selectedAgent.name)}…"
            maxlength="200"
          >

          <button
            class="btn btn-primary"
            type="submit"
          >
            Send
          </button>

        </form>

      </section>
    </div>

    <p class="fine">
      ${icon('shield', 14)}
      ${
        selectedAgent.live
          ? "Musa'id uses AI to explain financial concepts. Company research, Pick coach and Market brief are currently demo modes."
          : "This agent currently uses NUMU's scripted demo content and sample market figures."
      }
      Educational information only, not investment advice.
    </p>
  `;
}
