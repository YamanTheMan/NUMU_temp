# NUMU (نمو)

*Where knowledge grows wealth.* A demo platform that teaches people how to invest in the Qatar Stock Exchange, then lets them compete with friends in a daily pick-3 challenge with leaderboards and leagues. Green theme matching the logo.

## Run it (Windows)

**Easiest:** double-click `NUMU-demo.html`. It opens in your browser. No install needed.

**With the local server:** double-click `start.bat`. It starts the app and opens http://127.0.0.1:4173. Needs Node.js (https://nodejs.org, LTS). Close the black window to stop it.

**From a terminal:** open Command Prompt in this folder and run `node server.js`, then open http://127.0.0.1:4173. (In PowerShell, `npm run dev` can be blocked by Windows script policy; use `npm.cmd run dev` or `node server.js` instead.)

Don't open `index.html` directly. Browsers block that file when it isn't served, which leaves a blank page. `NUMU-demo.html` is the version made for double-clicking.

## How the demo works

0. **Log in or create an account**: email and password with validation, show password, forgot password and "keep me logged in". Demo only: any email plus an 8+ character password works, nothing is sent anywhere and passwords are never saved. A real version needs a backend for accounts.

1. **Learn**: 12 short lessons in 4 units (Start here, Risk and return, Know the company, Investor habits). Each has 3 cards and a quick check quiz. Lessons earn XP.
2. **Compete**: pick 3 QSE stocks, give a reason for each, lock in before 9:30 AM Qatar time. Before finishing *Start here* you play practice rounds; after, rounds are ranked.
3. **Review**: "Play out the session (demo)" simulates the day. Results show your return, rank and points, and explain what the round teaches with links back to lessons.
4. **Agents**: AI helpers. Tutor (explains terms), Company research (brief on any QSE company), Pick coach (reviews your picks, never picks for you) and Market brief (daily summary). Demo answers are scripted from the app's sample data; a live version would plug in an AI model.
5. **Leaderboard**: everyone or per league, weekly or season. Points come from lessons and challenges. Create a league or join one with the code `DOHA24`.

Profile menu (avatar): badges, notifications, **Demo: finish Start here** (unlocks ranked rounds fast for presentations), reset, log out.

## Data status

Company names and tickers are real QSE listings. All prices, changes, volumes, P/E ratios, yields and simulated session moves are **sample values**. Players and leagues are fictional. No live data, accounts or trading. See `docs/QSE-DATA-PLAN.md` for licensed data options.

## Files

- `src/data.js`: lessons, quizzes, QSE companies (sample figures), players, leagues, scoring rules
- `src/model.js`: unlocking, scoring, simulated sessions, Qatar market clock, leaderboard
- `src/views.js`: Home, Learn, lesson player, Markets, Compete, Leaderboard
- `src/agents.js`: Agents page and scripted agent answers
- `src/engagement*.js`: login, profile, notifications, progress
- `src/styles.css`, `src/engagement.css`: design
- `_previous-namaa-violet/`: backup of the earlier violet Namaa version

```sh
npm run check && npm test && npm run build
```
