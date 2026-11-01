/**
 * NUMU learning and challenge data.
 * Company names and tickers are real QSE listings. Every price, change, volume,
 * P/E and yield here is a SAMPLE value for learning, not live or historical market data.
 * Players and leagues are fictional.
 */

export const sectors = [
  { id: 'banks', name: 'Banks & financial services', short: 'Banks', color: '#FF6B1A', lessonId: 'how-companies-earn',
    explainer: 'The largest sector on the QSE by market value. Banks earn the gap between what they pay for funding and what they earn on loans, plus fees. Interest rates and loan demand move them, which is why Qatari banks often rise and fall together.' },
  { id: 'industrials', name: 'Industrials', short: 'Industrials', color: '#8A1538', lessonId: 'how-companies-earn',
    explainer: 'Petrochemicals, fertilisers, steel, aluminium and utilities. Many of these companies sell at global prices, so commodity and energy markets matter as much as anything happening in Doha.' },
  { id: 'consumer', name: 'Consumer goods & services', short: 'Consumer', color: '#E0A100', lessonId: 'how-companies-earn',
    explainer: 'Fuel retail, food and everyday services. Demand tends to follow Qatar’s population and household spending, so results are often steadier than commodity businesses.' },
  { id: 'realestate', name: 'Real estate', short: 'Real estate', color: '#2F7D6B', lessonId: 'risk',
    explainer: 'Developers and landlords. Rents, occupancy and borrowing costs drive results. Big projects can take years to pay back, so debt levels deserve a close look.' },
  { id: 'telecoms', name: 'Telecoms', short: 'Telecoms', color: '#3B5BDB', lessonId: 'how-companies-earn',
    explainer: 'Mobile and broadband providers. Monthly subscriptions make revenue fairly predictable, while network upgrades need heavy, ongoing investment.' },
  { id: 'transport', name: 'Transportation', short: 'Transport', color: '#5C3D99', lessonId: 'how-companies-earn',
    explainer: 'Shipping and logistics, including the carriers that move Qatar’s liquefied natural gas. Long-term contracts can make revenue steadier than the daily share price suggests.' },
  { id: 'insurance', name: 'Insurance', short: 'Insurance', color: '#B5475A', lessonId: 'risk',
    explainer: 'Insurers collect premiums up front, pay claims later and invest the money in between. Claim surprises and investment returns both move profit.' },
];

export const stocks = [
  { ticker: 'QNBK', name: 'QNB Group', sector: 'banks', price: 18.2, change: 1.22, volume: 4.8, pe: 9.6, yield: 3.9,
    about: 'Qatar’s largest bank, with operations across the Middle East, Africa, Europe and Asia.',
    earns: 'Lending to companies, government entities and individuals, plus fees from payments, cards and trade finance.',
    watch: 'Interest rates, loan growth and how its international businesses are doing.' },
  { ticker: 'QIBK', name: 'Qatar Islamic Bank', sector: 'banks', price: 23.1, change: 0.48, volume: 1.9, pe: 11.2, yield: 3.8,
    about: 'One of Qatar’s largest Islamic banks.',
    earns: 'Sharia-compliant financing such as murabaha and ijara, where the bank earns a profit on asset-based deals instead of charging interest.',
    watch: 'Financing demand, funding costs and the quality of its financing book.' },
  { ticker: 'MARK', name: 'Masraf Al Rayan', sector: 'banks', price: 2.364, change: -0.34, volume: 14.2, pe: 15.5, yield: 4.2,
    about: 'A large Qatari Islamic bank serving companies, government entities and individuals.',
    earns: 'Sharia-compliant financing and fees, with a large share of business linked to Qatar’s government and public sector.',
    watch: 'Funding costs, financing growth and provisions for bad debts.' },
  { ticker: 'CBQK', name: 'Commercial Bank', sector: 'banks', price: 4.482, change: 0.92, volume: 6.3, pe: 6.8, yield: 5.6,
    about: 'A long-established private-sector Qatari bank serving businesses and individuals.',
    earns: 'Corporate and retail lending, plus card and transaction fees.',
    watch: 'Loan quality and the interest margin it earns on lending.' },
  { ticker: 'DHBK', name: 'Doha Bank', sector: 'banks', price: 2.418, change: -0.62, volume: 8.7, pe: 7.4, yield: 4.1,
    about: 'A Qatari commercial bank with retail, corporate and some international business.',
    earns: 'Lending, deposits and banking fees.',
    watch: 'Asset quality, provisions and how efficiently it runs its costs.' },
  { ticker: 'IQCD', name: 'Industries Qatar', sector: 'industrials', price: 12.85, change: -1.08, volume: 3.6, pe: 15, yield: 5.3,
    about: 'A holding company with businesses in petrochemicals, fertilisers and steel.',
    earns: 'Selling products like urea, polyethylene and steel at prices set largely by global markets.',
    watch: 'Global fertiliser, petrochemical and energy prices, which can swing its profit a lot from year to year.' },
  { ticker: 'MPHC', name: 'Mesaieed Petrochemical', sector: 'industrials', price: 1.522, change: -1.36, volume: 9.4, pe: 19.8, yield: 4.6,
    about: 'Holds stakes in petrochemical businesses in Mesaieed Industrial City.',
    earns: 'Its share of profits from plants producing plastics and chemicals sold worldwide.',
    watch: 'Petrochemical prices and feedstock costs.' },
  { ticker: 'QAMC', name: 'Qatar Aluminium Manufacturing', sector: 'industrials', price: 1.314, change: 2.1, volume: 11.8, pe: 12.4, yield: 5.7,
    about: 'Holds a stake in Qatalum, an aluminium smelter in Mesaieed.',
    earns: 'Its share of profits from selling aluminium at global prices.',
    watch: 'The global aluminium price and energy costs.' },
  { ticker: 'QEWS', name: 'Qatar Electricity & Water', sector: 'industrials', price: 16.05, change: 0.31, volume: 0.8, pe: 12.9, yield: 4.9,
    about: 'Produces a large share of Qatar’s electricity and desalinated water.',
    earns: 'Long-term agreements to sell power and water capacity.',
    watch: 'New plant contracts and the cost of building them.' },
  { ticker: 'ORDS', name: 'Ooredoo', sector: 'telecoms', price: 12.6, change: 0.64, volume: 2.2, pe: 10.8, yield: 4.8,
    about: 'A telecom group providing mobile, broadband and business services in Qatar and several other countries.',
    earns: 'Monthly subscriptions, data plans and enterprise services.',
    watch: 'Customer growth, network investment and currency moves in its international markets.' },
  { ticker: 'VFQS', name: 'Vodafone Qatar', sector: 'telecoms', price: 2.214, change: 1.47, volume: 5.1, pe: 15.6, yield: 5.4,
    about: 'A mobile, home broadband and business connectivity provider in Qatar.',
    earns: 'Mobile plans, home internet and business services.',
    watch: 'Competition for customers and the cost of network upgrades.' },
  { ticker: 'QGTS', name: 'Nakilat', sector: 'transport', price: 4.618, change: 0.87, volume: 7.5, pe: 14.2, yield: 3.4,
    about: 'Owns and operates one of the world’s largest fleets of liquefied natural gas carriers.',
    earns: 'Chartering ships to carry LNG, often under long-term contracts.',
    watch: 'New ship orders, financing costs and growth in Qatar’s LNG exports.' },
  { ticker: 'QNNS', name: 'Milaha', sector: 'transport', price: 11.4, change: -0.52, volume: 1.1, pe: 11.3, yield: 3.7,
    about: 'A maritime and logistics group covering shipping, port services and offshore support.',
    earns: 'Freight, logistics services and its investments in other companies.',
    watch: 'Global shipping rates and regional trade volumes.' },
  { ticker: 'BRES', name: 'Barwa Real Estate', sector: 'realestate', price: 2.861, change: 0.25, volume: 4.4, pe: 8.9, yield: 6.3,
    about: 'A real estate developer and landlord with residential and commercial property.',
    earns: 'Rent, property sales and development projects.',
    watch: 'Occupancy, rent levels and borrowing costs.' },
  { ticker: 'UDCD', name: 'United Development Company', sector: 'realestate', price: 1.082, change: -0.83, volume: 6.9, pe: 10.4, yield: 4.6,
    about: 'The master developer of The Pearl-Qatar island community.',
    earns: 'Selling and leasing property, plus services on The Pearl.',
    watch: 'Property demand, sales timing and debt levels.' },
  { ticker: 'BLDN', name: 'Baladna', sector: 'consumer', price: 1.368, change: 3.48, volume: 12.6, pe: 16.2, yield: 3.1,
    about: 'A Qatari dairy and food producer making milk, yoghurt, cheese and juices.',
    earns: 'Selling dairy and food products in Qatar and to export markets.',
    watch: 'Feed costs, local demand and expansion projects abroad.' },
  { ticker: 'QFLS', name: 'Qatar Fuel (WOQOD)', sector: 'consumer', price: 15.2, change: -0.2, volume: 0.9, pe: 14.5, yield: 5.9,
    about: 'Runs Qatar’s network of WOQOD fuel stations and related services.',
    earns: 'Fuel sales, convenience stores and vehicle services.',
    watch: 'Fuel volumes, margins and new station openings.' },
  { ticker: 'QATI', name: 'Qatar Insurance', sector: 'insurance', price: 2.104, change: 0.38, volume: 3.2, pe: 9.8, yield: 4.8,
    about: 'An insurance group covering property, motor, medical and specialty risks.',
    earns: 'Premiums from policies, plus returns from investing that money.',
    watch: 'Claims, pricing discipline and investment returns.' },
];

/** Sample QE Index snapshot used on Home and Markets. */
export const marketSnapshot = { name: 'QE Index', value: 10520.34, change: 0.42 };

export const units = [
  { id: 'start', title: 'Start here', summary: 'What a share is, how the QSE works and how to read a quote.', reward: 'Unlocks the ranked Daily Challenge', rewardIcon: 'trophy',
    lessons: ['what-is-a-share', 'meet-qse', 'read-a-quote'] },
  { id: 'risk-return', title: 'Risk and return', summary: 'Why prices swing, why spreading out helps and how time adds up.', reward: 'Earns the Risk aware badge', rewardIcon: 'shield',
    lessons: ['risk', 'diversify', 'compounding'] },
  { id: 'company', title: 'Know the company', summary: 'How Qatari companies make money and the numbers that describe them.', reward: 'Earns the Analyst badge', rewardIcon: 'search',
    lessons: ['how-companies-earn', 'pe-ratio', 'dividends'] },
  { id: 'habits', title: 'Investor habits', summary: 'Costs, opening a real account and keeping the game in perspective.', reward: 'Earns the NUMU graduate badge', rewardIcon: 'award',
    lessons: ['costs', 'getting-started', 'skill-vs-luck'] },
];

export const lessons = [
  {
    id: 'what-is-a-share', unit: 'start', title: 'What you own when you buy a share', minutes: 4,
    summary: 'Ownership, prices and the two ways a share can make or lose money.',
    cards: [
      { heading: 'A small piece of a real business', body: 'When a company lists on the Qatar Stock Exchange, its ownership is split into shares. Buy one share of QNB and you own a tiny slice of the bank, including a claim on part of its future profits.' },
      { heading: 'Why prices move', body: 'A share price is the last price a buyer and a seller agreed on. It rises when more people want to buy than sell, and falls when it’s the other way round. Company results, interest rates and energy prices all change what people are willing to pay.',
        example: 'Industries Qatar sells fertilisers and petrochemicals at global prices, so its share price often reacts to commodity markets, not just news from Doha.' },
      { heading: 'Two ways to earn, one way to lose', body: 'You can earn when the price rises above what you paid, or when the company pays a dividend. You can also lose: if the price falls and you sell, that loss is real. Shares come with no guarantee.', term: ['Dividend', 'A share of company profit paid out to shareholders, usually in cash.'] },
    ],
    quiz: [
      { q: 'You own 100 shares of a company. What do you actually have?', options: ['A loan the company must repay', 'A small ownership stake in the company', 'A guaranteed yearly payment', 'A deposit protected by the bank'], answer: 1, explain: 'A share is part ownership. It isn’t a loan, and nothing about it is guaranteed.' },
      { q: 'What sets a share’s price at any moment?', options: ['The company decides each morning', 'The government fixes it', 'The last price a buyer and seller agreed on', 'Company profit divided by 100'], answer: 2, explain: 'Prices come from trades. The last agreed price is what you see on a quote.' },
    ],
    takeaway: 'A share is ownership in a business, and its price is whatever buyers and sellers agree on.',
  },
  {
    id: 'meet-qse', unit: 'start', title: 'Meet the Qatar Stock Exchange', minutes: 4,
    summary: 'Trading days, session times, sectors and the QE Index.',
    cards: [
      { heading: 'Where Qatar’s companies trade', body: 'The Qatar Stock Exchange (QSE) in Doha is where shares of listed Qatari companies are bought and sold. Prices are in Qatari riyals (QAR), which are pegged to the US dollar at 3.64.' },
      { heading: 'The trading day', body: 'The QSE trades Sunday to Thursday. Orders can be entered from 9:00 AM, matching starts at 9:30 AM and continuous trading runs until 1:00 PM. A closing auction then sets the official closing price at about 1:10 PM.',
        example: 'That’s why the Daily Challenge locks your picks at 9:30 AM. Once trading starts, nobody gets to pick with hindsight.' },
      { heading: 'Sectors and the QE Index', body: 'Listed companies are grouped into seven sectors: banks and financial services, industrials, consumer goods and services, real estate, telecoms, transportation and insurance. The QE Index tracks 20 of the largest and most traded companies, so people use it as a quick read on the whole market.', term: ['Index', 'A single number that tracks the combined price moves of a group of shares.'] },
    ],
    quiz: [
      { q: 'On which days does the QSE trade?', options: ['Monday to Friday', 'Sunday to Thursday', 'Every day of the week', 'Saturday to Wednesday'], answer: 1, explain: 'The QSE follows Qatar’s working week: Sunday to Thursday.' },
      { q: 'What does the QE Index tell you?', options: ['The price of one company', 'How 20 large, actively traded companies are doing together', 'Qatar’s interest rate', 'How many people invested today'], answer: 1, explain: 'An index combines many companies into one number, giving a quick picture of the market.' },
    ],
    takeaway: 'The QSE trades Sunday to Thursday, 9:30 AM to about 1:10 PM, and the QE Index is the market’s headline number.',
  },
  {
    id: 'read-a-quote', unit: 'start', title: 'How to read a stock quote', minutes: 3,
    summary: 'Price, change, volume, daily limits and why percent beats riyals.',
    cards: [
      { heading: 'The numbers on a quote', body: 'A quote shows the last traded price, the change since the previous close in riyals and in percent, and the volume: how many shares changed hands today.', example: 'QNBK 18.20, up 0.22 (+1.22%) means QNB last traded at QAR 18.20, 22 dirhams above yesterday’s close.' },
      { heading: 'Limits and tick sizes', body: 'On the QSE a share generally can’t move more than 10% above or below the previous close in one session. Prices also move in fixed steps called ticks: QAR 0.01 for shares at QAR 10 and above, and QAR 0.001 below QAR 10.', example: 'That’s why Masraf Al Rayan shows a price like 2.364 while QNB shows 18.20.' },
      { heading: 'Percent beats riyals', body: 'A 0.20 riyal move is 10% for a QAR 2 share but only about 1% for a QAR 18 share. Always compare moves in percent. The Daily Challenge scores you the same way: the average percent change of your three picks.', term: ['Volume', 'The number of shares traded in a session. High volume means lots of buying and selling.'] },
    ],
    quiz: [
      { q: 'Share A rose QAR 0.20 from QAR 2.00. Share B rose QAR 0.50 from QAR 25.00. Which did better?', options: ['Share A, up 10%', 'Share B, because 0.50 is bigger', 'They did the same', 'You can’t tell'], answer: 0, explain: 'A gained 10%, B gained 2%. Percent lets you compare fairly.' },
      { q: 'A share closed at QAR 10.00 yesterday. Roughly what’s the highest it can trade today?', options: ['QAR 10.50', 'QAR 11.00', 'QAR 15.00', 'There’s no limit'], answer: 1, explain: 'The daily limit is about 10% from the previous close, so roughly QAR 11.00.' },
    ],
    takeaway: 'Read the price, the percent change and the volume, and compare shares in percent, not riyals.',
  },
  {
    id: 'risk', unit: 'risk-return', title: 'Risk you can explain', minutes: 4,
    summary: 'Risk is more than prices going up and down.',
    cards: [
      { heading: 'Risk is more than ups and downs', body: 'Risk includes losing money, needing cash when prices are low, having too much in one company, and inflation slowly eating what your money can buy.' },
      { heading: 'Time changes everything', body: 'A 10% drop feels very different if you need the money next month than if you’re investing for ten years. The shorter your timeline, the less price swings you can afford.', example: 'Money for next month’s rent shouldn’t be in shares. Savings you won’t touch for years can ride out bad months.' },
      { heading: 'Return and risk travel together', body: 'Investments that can rise more can usually fall more. If someone promises high returns with no risk, treat it as a red flag.', term: ['Volatility', 'How much and how often a price swings. More volatile means bigger moves both ways.'] },
    ],
    quiz: [
      { q: 'Who is most exposed to a short-term price drop?', options: ['Someone saving for a house deposit due next month', 'Someone investing for retirement in 25 years', 'Both equally', 'Neither'], answer: 0, explain: 'If you need the money soon, you may have to sell after a drop and lock in the loss.' },
      { q: 'Someone promises 30% a year with no risk. What should you think?', options: ['Great deal, sign up', 'Red flag: higher returns come with more risk', 'Normal for Qatar', 'Fine if it’s a bank'], answer: 1, explain: 'High return with no risk doesn’t exist. Promises like that are a common sign of a scam.' },
    ],
    takeaway: 'Describe what could go wrong in plain words, then ask what it would mean for your own plans.',
  },
  {
    id: 'diversify', unit: 'risk-return', title: 'Don’t let one sector decide your day', minutes: 4,
    summary: 'Why three banks is closer to one bet than three.',
    cards: [
      { heading: 'Spreading out', body: 'Diversification means owning different things that don’t all depend on the same news. If one company has a bad day, the others can soften the blow.' },
      { heading: 'Same sector, same mood', body: 'Qatari banks often move together because they share the same drivers: interest rates, government spending and loan demand. Owning QNB, QIB and Commercial Bank is closer to one bet than three.' },
      { heading: 'Mix the drivers', body: 'Pair a bank with an industrial and a telecom and one bad sector day hurts less. Diversification lowers concentration risk, but it can’t protect you when the whole market falls.', example: 'In the Daily Challenge, picks from three different sectors earn a +10 Spread it out bonus.' },
    ],
    quiz: [
      { q: 'Which set of picks is the most diversified?', options: ['QNBK, QIBK, CBQK', 'QNBK, IQCD, ORDS', 'IQCD, MPHC, QAMC', 'BRES, UDCD, QNBK'], answer: 1, explain: 'A bank, an industrial and a telecom have different drivers. The others are mostly one sector.' },
      { q: 'What can diversification not do?', options: ['Reduce reliance on one company', 'Spread risk across sectors', 'Protect you when the whole market falls', 'Lower concentration'], answer: 2, explain: 'When the whole market drops, most shares drop with it. That’s market risk.' },
    ],
    takeaway: 'Count different sources of risk, not just the number of shares you own.',
  },
  {
    id: 'compounding', unit: 'risk-return', title: 'Let time do some of the work', minutes: 3,
    summary: 'How reinvested returns build on themselves.',
    cards: [
      { heading: 'Returns on returns', body: 'Compounding happens when returns stay invested and earn returns of their own. QAR 1,000 growing 5% becomes QAR 1,050 after a year. Another 5% on that new balance makes QAR 1,102.50.' },
      { heading: 'Dividends can compound too', body: 'Reinvesting dividends to buy more shares means next year’s dividend is paid on a bigger holding.' },
      { heading: 'Read the fine print', body: 'Those examples assume a steady return, no costs and no withdrawals. Real markets don’t move in a straight line, and the rates here are illustrations, not forecasts.', term: ['Compounding', 'Earning returns on your earlier returns, not just on the money you put in.'] },
    ],
    quiz: [
      { q: 'QAR 1,000 grows 10% a year for two years, reinvested. What’s it worth?', options: ['QAR 1,200', 'QAR 1,210', 'QAR 1,100', 'QAR 1,020'], answer: 1, explain: '1,000 → 1,100 after year one, then 10% of 1,100 brings it to 1,210.' },
      { q: 'What helps compounding most?', options: ['Time and reinvesting returns', 'Trading every day', 'Owning a single stock', 'Withdrawing gains each year'], answer: 0, explain: 'The longer returns stay invested, the more they can build on themselves.' },
    ],
    takeaway: 'Time and reinvesting do the heavy lifting, but growth is never guaranteed.',
  },
  {
    id: 'how-companies-earn', unit: 'company', title: 'How Qatari companies make money', minutes: 4,
    summary: 'Banks, industrials, telecoms and shippers earn in very different ways.',
    cards: [
      { heading: 'Banks', body: 'Conventional banks earn interest on loans and pay less on deposits. Islamic banks like QIB and Masraf Al Rayan use Sharia-compliant structures, earning a profit on asset-based deals instead of interest. Both earn fees too.' },
      { heading: 'Industrials', body: 'Industries Qatar, Mesaieed Petrochemical and Qatar Aluminium sell products at global prices. When fertiliser, plastic or aluminium prices move, their profits can swing a lot.' },
      { heading: 'Subscriptions and contracts', body: 'Ooredoo and Vodafone Qatar earn monthly subscriptions. Nakilat charters LNG ships under long-term contracts. Agreed revenue years ahead tends to make profits steadier.', term: ['Revenue', 'All the money a company brings in from sales, before costs.'] },
    ],
    quiz: [
      { q: 'Industries Qatar’s profit is most sensitive to…', options: ['Global commodity prices', 'Mobile subscriptions', 'Home rents in Lusail', 'Insurance claims'], answer: 0, explain: 'It sells fertilisers, petrochemicals and steel at prices set by global markets.' },
      { q: 'Why can long-term contracts make revenue steadier?', options: ['Prices and volumes are agreed years ahead', 'The government fixes the share price', 'The company has no costs', 'The company can’t lose money'], answer: 0, explain: 'Agreed contracts reduce surprises in revenue, though costs and risks remain.' },
    ],
    takeaway: 'Know what drives a company’s money before you guess where its price is going.',
  },
  {
    id: 'pe-ratio', unit: 'company', title: 'Is it cheap? Meet the P/E ratio', minutes: 3,
    summary: 'What you pay for each riyal of profit.',
    cards: [
      { heading: 'Price ÷ earnings', body: 'The price-to-earnings ratio divides the share price by the company’s yearly profit per share. A share at QAR 18 earning QAR 1.80 per share has a P/E of 10: you pay 10 riyals for every riyal of yearly profit.' },
      { heading: 'Low isn’t always cheap', body: 'A low P/E can mean a bargain, or it can mean the market expects profits to fall. A high P/E can mean expected growth, or excitement that may fade.' },
      { heading: 'Compare like with like', body: 'Banks usually trade on lower P/Es than fast-growing companies. Compare a bank with other banks, not with a dairy company.', term: ['Earnings per share', 'A company’s yearly profit divided by its number of shares.'] },
    ],
    quiz: [
      { q: 'Price QAR 12, earnings per share QAR 1.50. What’s the P/E?', options: ['8', '18', '1.5', '12'], answer: 0, explain: '12 ÷ 1.5 = 8.' },
      { q: 'What’s the best way to use P/E?', options: ['Compare companies in the same sector', 'Always buy the lowest P/E', 'Compare a bank with a telecom', 'Ignore earnings'], answer: 0, explain: 'Different sectors have different normal P/E ranges.' },
    ],
    takeaway: 'P/E tells you what you pay for profit. Compare within a sector and ask why it’s high or low.',
  },
  {
    id: 'dividends', unit: 'company', title: 'Dividends in Qatar', minutes: 4,
    summary: 'Payouts, yield and what a high yield might be telling you.',
    cards: [
      { heading: 'Cash back to owners', body: 'Many QSE companies pay cash dividends, most often once a year after their annual results are approved early in the year. Some also pay an interim dividend mid-year.' },
      { heading: 'Dividend yield', body: 'Yield is the yearly dividend divided by the share price. A QAR 0.70 dividend on a QAR 14 share is a 5% yield. You need to own the shares by the cut-off date set for that dividend to receive it.' },
      { heading: 'When a high yield is a warning', body: 'If a price falls sharply, the yield jumps even though nothing improved. Check whether profits can keep paying that dividend before treating a high yield as a gift.', term: ['Dividend yield', 'Yearly dividend ÷ share price, shown as a percent.'] },
    ],
    quiz: [
      { q: 'Dividend QAR 0.50, price QAR 10. What’s the yield?', options: ['5%', '0.5%', '50%', '20%'], answer: 0, explain: '0.50 ÷ 10 = 0.05, or 5%.' },
      { q: 'A yield jumped because the price fell sharply. What should you check?', options: ['Whether profits can keep paying the dividend', 'Nothing, a high yield is always good', 'The colour of the chart', 'The exchange’s opening time'], answer: 0, explain: 'A dividend is only as safe as the profits behind it.' },
    ],
    takeaway: 'Yield is dividend ÷ price. Make sure profits can keep paying it.',
  },
  {
    id: 'costs', unit: 'habits', title: 'What it costs to trade', minutes: 3,
    summary: 'Commissions, minimum fees and settlement.',
    cards: [
      { heading: 'Commission', body: 'Brokers charge a commission each time you buy or sell. On the QSE the standard rate is about 0.275% of the trade value, so a QAR 10,000 purchase costs about QAR 27.50.' },
      { heading: 'Small trades and frequent trades', body: 'Brokers can set a minimum fee per trade, so very small trades can cost much more in percent terms. Trading in and out often adds costs on both sides every time.' },
      { heading: 'Settlement', body: 'The QSE settles trades on T+2: cash and shares change hands two business days after the trade. Buy on Sunday and it settles on Tuesday.', term: ['Settlement', 'When the shares and cash actually change hands after a trade.'] },
    ],
    quiz: [
      { q: 'What’s 0.275% commission on a QAR 10,000 purchase?', options: ['QAR 27.50', 'QAR 2.75', 'QAR 275', 'QAR 0.275'], answer: 0, explain: '10,000 × 0.00275 = 27.50.' },
      { q: 'You buy on Sunday. With T+2, when does it settle?', options: ['Tuesday', 'Sunday', 'Monday', 'Thursday'], answer: 0, explain: 'Two business days after Sunday is Tuesday.' },
    ],
    takeaway: 'Costs come on every trade. Fewer, bigger, well-reasoned trades usually cost less.',
  },
  {
    id: 'getting-started', unit: 'habits', title: 'From practice to a real account', minutes: 4,
    summary: 'The NIN, brokers and a plan before your first real trade.',
    cards: [
      { heading: 'Your National Investor Number', body: 'To own QSE shares you need a National Investor Number (NIN) from Qatar’s central securities depository. You can apply directly or through a licensed broker, usually with your ID and a letter or stamp from your Qatari bank.' },
      { heading: 'A trading account', body: 'With a NIN, you open a trading account with a licensed broker and place orders through their app or branch. Rules can differ for non-Qatari investors, so check what applies to you before you start.' },
      { heading: 'Start with a plan', body: 'Keep an emergency fund first, only invest money you won’t need soon, and keep each position small enough that one mistake won’t hurt much.', example: 'NUMU is for learning. It never places real trades or holds your money.' },
    ],
    quiz: [
      { q: 'What do you need before a broker can trade QSE shares for you?', options: ['A National Investor Number (NIN)', 'A QE Index licence', 'A NUMU badge', 'Nothing at all'], answer: 0, explain: 'The NIN identifies you as an investor with the central depository.' },
      { q: 'Which money is best kept out of shares?', options: ['Money you’ll need in the next few months', 'Long-term savings', 'Money you can leave invested for years', 'None of it'], answer: 0, explain: 'Short-term money can’t wait out a bad month.' },
    ],
    takeaway: 'Get a NIN, choose a licensed broker and start small with money you won’t need soon.',
  },
  {
    id: 'skill-vs-luck', unit: 'habits', title: 'Prediction games vs. real investing', minutes: 3,
    summary: 'What a daily challenge can and can’t teach you.',
    cards: [
      { heading: 'One day is mostly noise', body: 'Daily moves are driven by news, mood and chance. A great day can be pure luck, and a bad day doesn’t mean your thinking was wrong.' },
      { heading: 'Judge the reasoning', body: 'Write down why you picked something, then check it against what happened. That’s why every challenge pick asks for a reason.' },
      { heading: 'Real investing is slower', body: 'Building wealth usually means owning good businesses for years, spread across sectors, with low costs. The challenge trains your thinking. It isn’t a strategy for your savings.', term: ['Noise', 'Short-term price moves that don’t reflect any real change in a business.'] },
    ],
    quiz: [
      { q: 'You came first today with three random picks. What does it prove?', options: ['Not much: one day is mostly noise', 'You’ve found a winning strategy', 'You should invest your savings this way', 'The market is easy'], answer: 0, explain: 'Over one day, luck dominates. Look at your reasoning over many rounds.' },
      { q: 'Why does the challenge ask why you picked each stock?', options: ['So you can check your reasoning against what happened', 'To slow you down', 'It changes your score', 'For advertising'], answer: 0, explain: 'Reviewing your reasons is how a game becomes learning.' },
    ],
    takeaway: 'Use the challenge to practise reasoning, and keep real investing slow and diversified.',
  },
];

/** Reasons a player can attach to each pick; each links to the lesson that explains it. */
export const reasons = [
  { id: 'dividend', label: 'Pays a solid dividend', lessonId: 'dividends' },
  { id: 'value', label: 'Looks cheap for its earnings', lessonId: 'pe-ratio' },
  { id: 'sector', label: 'Its sector is moving', lessonId: 'diversify' },
  { id: 'business', label: 'I understand the business', lessonId: 'how-companies-earn' },
  { id: 'hunch', label: 'Just a hunch', lessonId: 'skill-vs-luck' },
];

export const terms = [
  { term: 'Dividend yield', meaning: 'The yearly dividend divided by the share price. QAR 0.70 on a QAR 14 share is 5%.', lessonId: 'dividends' },
  { term: 'P/E ratio', meaning: 'Share price divided by yearly profit per share. It shows what you pay for each riyal of profit.', lessonId: 'pe-ratio' },
  { term: 'Tick size', meaning: 'The smallest step a price can move. On the QSE it’s QAR 0.001 below QAR 10 and QAR 0.01 above.', lessonId: 'read-a-quote' },
  { term: 'T+2', meaning: 'Trades on the QSE settle two business days after you buy or sell.', lessonId: 'costs' },
  { term: 'QE Index', meaning: 'Tracks 20 of the largest, most traded QSE companies. The market’s headline number.', lessonId: 'meet-qse' },
  { term: 'Diversification', meaning: 'Owning things with different drivers so one bad day doesn’t sink everything.', lessonId: 'diversify' },
  { term: 'NIN', meaning: 'Your National Investor Number. You need one before you can own QSE shares.', lessonId: 'getting-started' },
];

export const levels = [
  { min: 0, name: 'Newcomer' },
  { min: 50, name: 'Explorer' },
  { min: 120, name: 'Analyst' },
  { min: 200, name: 'Strategist' },
  { min: 300, name: 'Mentor' },
];

export const badges = [
  { id: 'first-step', name: 'First step', description: 'Finish your first lesson.', icon: 'book' },
  { id: 'market-ready', name: 'Market ready', description: 'Finish Start here and unlock ranked challenges.', icon: 'unlock' },
  { id: 'in-the-game', name: 'In the game', description: 'Lock in your first ranked challenge.', icon: 'target' },
  { id: 'spread-out', name: 'Spread it out', description: 'Pick three stocks from three different sectors.', icon: 'layers' },
  { id: 'top-quarter', name: 'Top 25%', description: 'Finish a ranked round in the top quarter.', icon: 'trophy' },
  { id: 'reflective', name: 'Reflective', description: 'Review what a round taught you.', icon: 'sparkles' },
  { id: 'risk-aware', name: 'Risk aware', description: 'Finish the Risk and return unit.', icon: 'shield' },
  { id: 'analyst', name: 'Analyst', description: 'Finish the Know the company unit.', icon: 'search' },
  { id: 'graduate', name: 'NUMU graduate', description: 'Finish every lesson.', icon: 'award' },
];

/** Fictional players. Points: learning XP plus challenge points. */
export const players = [
  { id: 'noora', name: 'Noora A.', xp: 330, challenge: 520, week: 142, lessons: 12, friend: true },
  { id: 'khalid', name: 'Khalid M.', xp: 210, challenge: 470, week: 118, lessons: 8, friend: true },
  { id: 'maryam', name: 'Maryam S.', xp: 290, challenge: 310, week: 96, lessons: 10, friend: true },
  { id: 'hamad', name: 'Hamad R.', xp: 120, challenge: 260, week: 70, lessons: 5, friend: true },
  { id: 'aisha', name: 'Aisha K.', xp: 180, challenge: 150, week: 64, lessons: 7, friend: true },
  { id: 'omar', name: 'Omar T.', xp: 60, challenge: 90, week: 30, lessons: 3, friend: true },
  { id: 'fatima', name: 'Fatima H.', xp: 360, challenge: 610, week: 160, lessons: 12 },
  { id: 'yousef', name: 'Yousef B.', xp: 240, challenge: 560, week: 150, lessons: 9 },
  { id: 'sara', name: 'Sara J.', xp: 300, challenge: 420, week: 110, lessons: 11 },
  { id: 'ali', name: 'Ali N.', xp: 150, challenge: 440, week: 104, lessons: 6 },
  { id: 'reem', name: 'Reem D.', xp: 270, challenge: 330, week: 88, lessons: 10 },
  { id: 'jassim', name: 'Jassim F.', xp: 90, challenge: 380, week: 92, lessons: 4 },
  { id: 'lina', name: 'Lina W.', xp: 200, challenge: 230, week: 58, lessons: 8 },
  { id: 'abdulla', name: 'Abdulla Q.', xp: 120, challenge: 200, week: 50, lessons: 5 },
  { id: 'hessa', name: 'Hessa M.', xp: 330, challenge: 180, week: 72, lessons: 12 },
  { id: 'tariq', name: 'Tariq L.', xp: 60, challenge: 170, week: 40, lessons: 3 },
  { id: 'dana', name: 'Dana E.', xp: 150, challenge: 120, week: 36, lessons: 6 },
  { id: 'saeed', name: 'Saeed G.', xp: 30, challenge: 110, week: 28, lessons: 2 },
  { id: 'mona', name: 'Mona Z.', xp: 90, challenge: 60, week: 22, lessons: 4 },
  { id: 'faisal', name: 'Faisal Y.', xp: 30, challenge: 40, week: 14, lessons: 1 },
];

export const defaultLeagues = [
  { id: 'majlis', name: 'Majlis League', code: 'MJLS42', members: ['noora', 'khalid', 'maryam', 'hamad', 'aisha', 'omar'], owner: 'noora' },
];

/** Leagues a demo user can join with a code. */
export const joinableLeagues = [
  { id: 'westbay', name: 'West Bay Weekend League', code: 'DOHA24', members: ['fatima', 'yousef', 'sara', 'jassim', 'lina'], owner: 'yousef' },
];

/** XP rules shared by the model and the interface copy. */
export const rules = {
  lessonXp: 20,
  perfectBonus: 10,
  entryPoints: 10,
  diversifiedBonus: 10,
  reviewBonus: 10,
  placement: [
    { upTo: 0.1, points: 100, label: 'Top 10%' },
    { upTo: 0.25, points: 60, label: 'Top 25%' },
    { upTo: 0.5, points: 30, label: 'Top half' },
  ],
};
