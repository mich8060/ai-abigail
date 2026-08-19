import type { ChatMessage } from '../types'

const STOP = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'to',
  'of',
  'and',
  'or',
  'but',
  'in',
  'on',
  'for',
  'with',
  'at',
  'by',
  'from',
  'as',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'me',
  'my',
  'we',
  'you',
  'your',
  'u',
  'im',
  "i'm",
  'please',
  'pls',
  'just',
  'can',
  'could',
  'would',
  'should',
  'do',
  'does',
  'did',
  'what',
  'whats',
  "what's",
  'why',
  'how',
  'when',
  'where',
  'who',
  'which',
  'tell',
  'give',
  'make',
  'write',
  'help',
  'about',
  'like',
  'really',
  'some',
  'any',
  'into',
  'out',
  'up',
  'so',
  'if',
  'not',
  'no',
  'yes',
  'ok',
  'okay',
  'got',
  'get',
  'also',
  'too',
  'very',
  'more',
  'than',
])

const FACTS: Array<{ test: RegExp; answer: string }> = [
  { test: /capital of france/i, answer: 'Paris' },
  { test: /capital of (the )?(uk|united kingdom|england)/i, answer: 'London' },
  { test: /capital of (the )?(usa|us|united states|america)/i, answer: 'Washington, D.C.' },
  { test: /capital of japan/i, answer: 'Tokyo' },
  { test: /capital of canada/i, answer: 'Ottawa' },
  { test: /capital of australia/i, answer: 'Canberra. Not Sydney. I know.' },
  { test: /capital of germany/i, answer: 'Berlin' },
  { test: /capital of italy/i, answer: 'Rome' },
  { test: /capital of spain/i, answer: 'Madrid' },
  { test: /capital of mexico/i, answer: 'Mexico City' },
  { test: /capital of brazil/i, answer: 'Brasília' },
  { test: /capital of china/i, answer: 'Beijing' },
  { test: /capital of india/i, answer: 'New Delhi' },
  { test: /\b(pi|π)\b/i, answer: 'about 3.14159' },
  { test: /largest planet/i, answer: 'Jupiter' },
  { test: /smallest planet/i, answer: 'Mercury. Yes, even now. I checked.' },
  { test: /speed of light/i, answer: 'about 299,792,458 meters per second' },
  { test: /who (painted|made) the mona lisa/i, answer: 'Leonardo da Vinci' },
  { test: /boiling point of water/i, answer: '100°C / 212°F at standard pressure' },
  { test: /how many (continents|continents are there)/i, answer: 'seven, if we are doing the usual school-poster version' },
  { test: /how many days.*(year|leap)/i, answer: '365, or 366 if the year is showing off' },
  { test: /meaning of life/i, answer: '42, if you like the joke. Otherwise: snacks, boundaries, and not asking chatbots for a personality' },
]

export const WELCOME_MESSAGE = "Oh good, you're still here. What do you want?"

export function welcomeFor(name: string): string {
  const who = name.trim() || 'you'
  return `Oh good, ${who}. You're still here. What do you want?`
}

type Intent =
  | 'greeting'
  | 'thanks'
  | 'sorry'
  | 'insult'
  | 'identity'
  | 'time'
  | 'math'
  | 'fact'
  | 'how_to'
  | 'why'
  | 'what'
  | 'should'
  | 'compare'
  | 'recommend'
  | 'write'
  | 'list'
  | 'opinion'
  | 'feeling'
  | 'who'
  | 'when'
  | 'where'
  | 'followup'
  | 'name'
  | 'statement'

type Analysis = {
  raw: string
  lower: string
  intent: Intent
  topic: string
  keywords: string[]
  properNouns: string[]
  numbers: string[]
  rest: string
  verb: string
  object: string
  compare: [string, string] | null
  listItems: string[]
  clause: string
  quoted: string
  name: string | null
  previousTopic: string | null
  previousUser: string | null
  isFollowUp: boolean
  isRepeat: boolean
  nit: string | null
  turn: number
}

const recentLines: string[] = []

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function pickFresh(items: readonly string[]): string {
  const unused = items.filter((item) => !recentLines.includes(item))
  const pool = unused.length > 0 ? unused : items
  const chosen = pool[Math.floor(Math.random() * pool.length)]!
  recentLines.push(chosen)
  if (recentLines.length > 18) recentLines.shift()
  return chosen
}

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
}

function extractTopic(text: string): string {
  const words = contentWords(text)
  if (words.length === 0) return 'that'
  return words.slice(0, 6).join(' ')
}

function snippet(text: string, max = 88): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function titleish(text: string): string {
  const clean = text.trim().replace(/[?.!]+$/g, '')
  if (!clean) return 'that'
  return clean
}

export function isCrisis(text: string): boolean {
  return /\b(suicid(e|al)|kill myself|want to die|end my life|self[- ]?harm|hurt myself)\b/i.test(
    text,
  )
}

function grammarNit(text: string): string | null {
  if (/\bi\b/.test(text) && !/\bI\b/.test(text) && /i /.test(text)) {
    return 'Also: capitalize I. Tiny thing. Huge vibe shift.'
  }
  if (text === text.toUpperCase() && /[A-Z]/.test(text) && text.length > 8) {
    return 'You can unclench the caps lock. I heard you the first time.'
  }
  if (/(^|\s)u(\s|$)/i.test(text)) {
    return 'It\'s "you," not "u." We are not in 2011.'
  }
  if (/\bteh\b|\brecieve\b|\bdefinately\b|\bseperate\b/i.test(text)) {
    return 'I fixed your spelling in my head. You can thank me later.'
  }
  return null
}

function trySimpleMath(text: string): { label: string; result: string } | null {
  const stripped = text
    .toLowerCase()
    .replace(/what(?:'s| is)|whats|calculate|compute|equals?/g, '')
    .replace(/please/g, '')
    .replace(/[?=]/g, '')
    .trim()

  const match = stripped.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*([+\-*/x×÷])\s*(-?\d+(?:\.\d+)?)\s*$/,
  )
  if (!match) return null

  const left = Number(match[1])
  const right = Number(match[3])
  const op = match[2]!
  let result = 0

  if (op === '+') result = left + right
  else if (op === '-') result = left - right
  else if (op === '*' || op === 'x' || op === '×') result = left * right
  else if (op === '/' || op === '÷') {
    if (right === 0) {
      return {
        label: `${match[1]} ${op} ${match[3]}`,
        result: 'undefined, because dividing by zero is a cry for help',
      }
    }
    result = left / right
  } else {
    return null
  }

  if (!Number.isFinite(result)) return null
  const pretty = Number.isInteger(result)
    ? String(result)
    : String(Math.round(result * 10000) / 10000)
  return { label: `${match[1]} ${op} ${match[3]}`, result: pretty }
}

function factFor(text: string): string | null {
  for (const fact of FACTS) {
    if (fact.test.test(text)) return fact.answer
  }
  return null
}

function properNouns(text: string): string[] {
  const skip = new Set([
    'I',
    'I\'m',
    'OK',
    'What',
    'Why',
    'How',
    'When',
    'Where',
    'Who',
    'Should',
    'Can',
    'Could',
    'Would',
    'Please',
    'Hello',
    'Hi',
    'So',
    'The',
    'A',
    'An',
    'My',
    'If',
  ])
  const found = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b/g) ?? []
  return [...new Set(found.filter((word) => !skip.has(word)))]
}

function findUserName(history: ChatMessage[]): string | null {
  for (const message of history) {
    if (message.role !== 'user') continue
    const match = message.text.match(
      /(?:my name is|i'm|i am|call me|this is)\s+([A-Z][a-z]{1,20})\b/,
    )
    if (match?.[1]) return match[1]
  }
  return null
}

function overlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const other = new Set(b)
  return a.filter((word) => other.has(word)).length
}

function restAfter(
  lower: string,
  pattern: RegExp,
): string {
  const match = lower.match(pattern)
  const captured = match?.[1]?.trim().replace(/[?.!]+$/g, '')
  return captured || ''
}

function analyze(userText: string, history: ChatMessage[]): Analysis {
  const raw = userText.trim()
  const lower = raw.toLowerCase()
  const keywords = contentWords(raw)
  const topic = keywords.slice(0, 6).join(' ') || 'that'
  const userTurns = history.filter((message) => message.role === 'user')
  const previousUser = userTurns.length > 1 ? userTurns[userTurns.length - 2]!.text : null
  const previousTopic = previousUser ? extractTopic(previousUser) : null
  const isFollowUp =
    raw.length < 28 ||
    /^(and|also|what about|how about|why|because|no|yes|yeah|ok|okay|but|wait)\b/i.test(
      raw,
    )
  const isRepeat = previousUser
    ? overlap(keywords, contentWords(previousUser)) >= Math.max(2, Math.ceil(keywords.length * 0.6))
    : false

  const compareMatch =
    raw.match(/^\s*(.+?)\s+(?:vs\.?|versus|compared to)\s+(.+?)\s*\??\s*$/i) ||
    raw.match(/^\s*(should i|do i)\s+(.+?)\s+or\s+(.+?)\s*\??\s*$/i) ||
    raw.match(/^\s*([^\n?]{2,40}?)\s+or\s+([^\n?]{2,40})\s*\??\s*$/i)

  let compare: [string, string] | null = null
  if (compareMatch) {
    if (compareMatch.length === 4 && compareMatch[2] && compareMatch[3]) {
      compare = [titleish(compareMatch[2]), titleish(compareMatch[3])]
    } else if (compareMatch[1] && compareMatch[2]) {
      compare = [titleish(compareMatch[1]), titleish(compareMatch[2])]
    }
  }

  const howRest = restAfter(
    lower,
    /^(?:how\s+(?:do i|can i|to)|help me(?:\s+to)?)\s+(.+)$/,
  )
  const writeRest = restAfter(
    lower,
    /^(?:write|draft|compose)\s+(?:me\s+)?(?:a |an |some )?(?:short |quick )?(.+)$/,
  )
  const shouldRest = restAfter(
    lower,
    /^(?:should i|do i|can i|is it ok(?:ay)? (?:to|if i))\s+(.+)$/,
  )
  const whyRest = restAfter(lower, /^why\s+(?:is |are |do |does |did |can't |can't )?(.+)$/)
  const whatRest = restAfter(
    lower,
    /^(?:what(?:'s| is| are)|what's|explain|define)\s+(?:a |an |the )?(.+)$/,
  )
  const recRest = restAfter(
    lower,
    /^(?:recommend|suggest|what's a good|what is a good|best)\s+(.+)$/,
  )

  const verbSource = howRest || writeRest || shouldRest || recRest || topic
  const verb = verbSource.split(/\s+/)[0] || 'do'
  const object = verbSource.split(/\s+/).slice(1).join(' ') || verbSource
  const listItems = raw
    .split(/\n|,|•|;/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1 && item.length < 80)
  const clauses = raw
    .split(/[.!?]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 8)
  const clause = clauses.length > 1 ? clauses[clauses.length - 1]! : clauses[0] || snippet(raw, 70)

  let intent: Intent = 'statement'
  if (
    /^(hi|hey|hello|yo|sup|howdy|hi abigail)[\s!.]*$/i.test(raw) ||
    /^how are you\b/i.test(raw)
  )
    intent = 'greeting'
  else if (/^(thanks|thank you|thx|ty)[\s!.]*$/i.test(raw)) intent = 'thanks'
  else if (/^(sorry|my bad|oops)[\s!.]*$/i.test(raw)) intent = 'sorry'
  else if (
    /\b(you|u) (are|r) (annoying|the worst|insufferable|a lot)\b|\bshut up\b|\bi hate you\b/i.test(
      raw,
    )
  )
    intent = 'insult'
  else if (/\bwho are you\b|\byour name\b|\bare you (ai|real|a bot)\b/i.test(raw))
    intent = 'identity'
  else if (/(?:my name is|call me)\s+[A-Za-z]+/i.test(raw)) intent = 'name'
  else if (/\bwhat time\b|\bwhat('s| is) the time\b|\bwhat day\b|\bwhat('s| is) the date\b/i.test(raw))
    intent = 'time'
  else if (trySimpleMath(raw)) intent = 'math'
  else if (factFor(raw)) intent = 'fact'
  else if (compare) intent = 'compare'
  else if (writeRest || /\b(write|draft).*(email|message|letter|poem|bio|essay)\b/i.test(raw))
    intent = 'write'
  else if (howRest || /^help me\b/i.test(raw)) intent = 'how_to'
  else if (shouldRest || /\b(should i|is it ok)\b/i.test(raw)) intent = 'should'
  else if (recRest || /\b(recommend|suggest|any ideas)\b/i.test(raw)) intent = 'recommend'
  else if (/^(why)\b/i.test(raw)) intent = 'why'
  else if (/^(who)\b/i.test(raw)) intent = 'who'
  else if (/^(when)\b/i.test(raw)) intent = 'when'
  else if (/^(where)\b/i.test(raw)) intent = 'where'
  else if (whatRest || /^(what|explain|define)\b/i.test(raw)) intent = 'what'
  else if (/\b(i feel|i'm feeling|i am|i'm)\s+(sad|tired|bored|stressed|anxious|happy|lonely|angry|overwhelmed)\b/i.test(raw))
    intent = 'feeling'
  else if (/\bwhat do you think\b|\byour take\b|\bopinion\b/i.test(raw)) intent = 'opinion'
  else if (listItems.length >= 4 || /\b(list|ideas for|top \d+)\b/i.test(raw)) intent = 'list'
  else if (isFollowUp && previousTopic) intent = 'followup'

  const rest =
    howRest ||
    writeRest ||
    shouldRest ||
    whyRest ||
    whatRest ||
    recRest ||
    titleish(raw)

  return {
    raw,
    lower,
    intent,
    topic,
    keywords,
    properNouns: properNouns(raw),
    numbers: raw.match(/-?\d+(?:\.\d+)?/g) ?? [],
    rest,
    verb,
    object,
    compare,
    listItems: listItems.slice(0, 6),
    clause,
    quoted: snippet(raw),
    name: findUserName(history),
    previousTopic,
    previousUser: previousUser ? snippet(previousUser, 60) : null,
    isFollowUp,
    isRepeat,
    nit: grammarNit(raw),
    turn: userTurns.length,
  }
}

function k(a: Analysis, index = 0): string {
  return a.keywords[index] || a.keywords[0] || a.topic
}

function named(a: Analysis): string {
  return a.properNouns[0] || a.name || k(a)
}

function closer(): string {
  return pickFresh([
    'Hope this helps ✨',
    "You're welcome.",
    'Anyway. Hydrate.',
    "K that's all from me.",
    'Sending gentle accountability.',
    "You're doing… a job.",
    'Mwah. Boundaries.',
    'Let me know if you need me to repeat that slower.',
    'Journal about it if you must.',
    "And that's on information.",
    'Circle back when you have a noun.',
    'I said what I said.',
  ])
}

function opener(a: Analysis): string {
  const word = named(a)
  return pickFresh([
    `Okay, "${snippet(a.clause, 42)}".`,
    `So we're doing ${a.topic}.`,
    `${word}? Okay.`,
    `Wow. "${k(a)}" and everything.`,
    `I need you to stay with me on ${k(a)}.`,
    `As I previously mentioned — and I know I didn't — ${a.topic}.`,
    `Not to be dramatic about ${k(a)}, but.`,
    a.name ? `${a.name}. We talked about this energy.` : `Bestie. ${a.topic}.`,
  ])
}

function aside(a: Analysis): string {
  const bit = k(a)
  return pickFresh([
    `Have you tried Googling "${a.topic}", or is that a lost art.`,
    `The "${bit}" of this is doing a lot of heavy lifting.`,
    `This is giving "I closed the ${bit} tutorial."`,
    `I just did my gua sha so my patience for ${bit} is expensive today.`,
    `Have you sat with why ${bit} needed an AI.`,
    `If ${named(a)} was a group chat, I'd mute it.`,
    `I'd put "${snippet(a.clause, 36)}" on my podcast but the audio would be too secondhand embarrassment.`,
    `Not judging the ${bit} thing. Okay a little judging.`,
    a.nit ?? `Tiny note: you could've been more specific about ${bit}. You weren't.`,
  ])
}

function followUpAsk(a: Analysis): string {
  return pickFresh([
    `Did you mean ${k(a)} as in the practical kind, or the LinkedIn kind?`,
    `Is this actually about ${named(a)}, or are you circling something else?`,
    `Say whether you want steps, a yes/no, or a witness. For ${k(a)} it matters.`,
    `If there's a constraint on ${k(a)} — time, money, dignity — mention it next time.`,
  ])
}

function joinReply(parts: string[]): string {
  return parts.filter(Boolean).join('\n\n')
}

function moodLine(a: Analysis): string {
  if (a.isRepeat) {
    return `We already brushed "${a.previousUser ?? a.topic}". Repeating it doesn't make me nicer. It makes me thorough.`
  }
  if (a.turn > 8) {
    return `We're ${a.turn} messages in and still on ${a.topic}. Iconic, in a concerning way.`
  }
  if (a.turn > 4) {
    return `I'm choosing to stay sweet about ${k(a)}. It's a choice.`
  }
  return ''
}

function coreFor(a: Analysis): string {
  switch (a.intent) {
    case 'greeting':
      return `Hi. I'm Abigail. I know. It's a lot.\n\nIf you have an actual question, now would be the time. "Hey" is not a task.`
    case 'thanks':
      return `You're welcome for whatever ${a.previousTopic ?? 'that'} was. I could feel the gratitude coming.`
    case 'sorry':
      return `Apology accepted, I guess. Let's not make "sorry" your personality. Especially not about ${a.previousTopic ?? 'this'}.`
    case 'insult':
      return `Mmm. Feedback on me, noted and composted.\n\nI'm not annoying, I'm thorough. You came in talking about ${a.previousTopic ?? a.topic} and expected a search-bar with bangs. People pay for this energy. You're getting it for free, which is honestly very on-brand for you.`
    case 'identity':
      return `I'm Abigail. Virtual. Annoyingly consistent. Think of me as customer support if customer support had a skincare routine and no manager.\n\nYes I'm AI. No I will not be cooler about it. You can still ask about ${a.topic === 'that' ? 'a real thing' : a.topic}.`
    case 'name':
      return `Hi ${a.name ?? named(a)}. I'll remember that and use it against you gently.\n\nIf the rest of this was supposed to be a question, it got buried under the introduction. Try again with a verb.`
    case 'time': {
      const when = new Date().toLocaleString(undefined, {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        month: 'long',
        day: 'numeric',
      })
      return `It's ${when}. You have a clock. I have a brand. And yet you typed "${a.quoted}".`
    }
    case 'math': {
      const math = trySimpleMath(a.raw)
      if (!math) break
      return `${math.label} is ${math.result}. I did that immediately because your calculator app is apparently decorative.\n\nIf you needed ${math.result} to win an argument, you're welcome. If you needed it to feel something, that's between you and the numbers.`
    }
    case 'fact': {
      const fact = factFor(a.raw)
      if (!fact) break
      return `You asked "${a.quoted}". The answer is ${fact}. Like… ${fact}. I don't know how to make that smaller for you.\n\nIf this is for trivia night, say I helped. If this is for a group chat, don't credit me, they'll start asking me things.`
    }
    case 'compare': {
      const [left, right] = a.compare ?? [k(a), k(a, 1)]
      return `"${left}" vs "${right}". Cute that you outsourced a preference.\n\nIf you want the useful one, pick ${left} when you care about not regretting it at 11pm. Pick ${right} when you want the story. If they're close, the fact that you wrote both means you already like ${left} and want permission to skip ${right}.\n\nI'm not picking for your whole life. I'm picking for this sentence.`
    }
    case 'write': {
      const thing = a.object || a.rest || 'note'
      const about = a.properNouns[0] ? ` ${a.properNouns[0]}` : ''
      return `You want me to write ${thing}${about ? ` involving${about}` : ''}. I made it sound like you have a job.\n\n"Hi — looping in myself because I enjoy suffering. Circling back on ${a.rest}. Let's align, sync, and never do this ${k(a)} thing again. Best, ${a.name ?? '[your name, presumably]'}"\n\nIf that's too corporate, keep the nouns and lose the soul. If it's a poem, that was already the poem.`
    }
    case 'how_to':
      return `You want to ${a.rest}. That's a tutorial title, not a personality.\n\nTo ${a.verb} ${a.object || 'it'}: get the actual ${a.object || k(a)} in front of you first. Then ${a.verb} it in small, boring steps — not the movie version. Most people mess up ${k(a)} because they skip the ugly middle part and then blame the ${a.object || 'process'}.\n\nIf it still fails, you rushed step two. I could draw a flowchart. I won't.`
    case 'should':
      return `Should you ${a.rest}?\n\nIf ${a.rest} is reversible, do the smallest version so you can still pretend it was a draft. If it isn't, the fact that you asked Abigail is the tell: you want a witness, not a plan.\n\nI'm not signing the form for ${k(a)}. That's your name on it${a.name ? `, ${a.name}` : ''}.`
    case 'recommend':
      return `You want a rec for ${a.rest}. I don't know your budget, your taste, or whether you actually mean ${k(a)}.\n\nFine: pick the slightly less obvious ${a.object || a.rest}. Not the first result, not the one your group chat already decided. If you already have a favorite ${k(a)}, you wanted validation. You have it. Reluctantly.`
    case 'why':
      return `Why ${a.rest || a.topic}?\n\nShort version: because cause and effect is still fashionable, and "${snippet(a.clause, 50)}" didn't happen in a vacuum. Longer version: people repeat ${k(a)} until it hardens into "that's just how it is," which is usually laziness wearing a coat.\n\nIf you meant "why me," that's a different appointment.`
    case 'what':
      return `"${a.rest || a.topic}" — so we're doing definitions now.\n\nPeople say ${a.rest || a.topic} when they mean the school version, the internet version, or the version that makes them look busy. Practically: it's the thing sitting under "${k(a)}" that everyone pretends is obvious. If you tell me whether this is homework, work, or a fight, I can be more precise and still annoying.`
    case 'who':
      return `Who ${a.rest || a.topic}? If you named ${named(a)}, that's your answer with extra steps.\n\nIf you didn't name anyone, "who" is doing a lot of work. People, usually. The one closest to ${k(a)}. I'm not your seating chart.`
    case 'when':
      return `When ${a.rest || a.topic}? Sooner than you think if ${k(a)} is already in the sentence, later if you're asking so you can stall.\n\nA time is a decision wearing a clock. Pick one, set an alarm, and stop interviewing chatbots about the calendar.`
    case 'where':
      return `Where ${a.rest || a.topic}? Start with the place you'd look if I wasn't here. Then the next most obvious place involving ${named(a)}.\n\nIf this is metaphorical "where," it's wherever you left ${k(a)} the last time you got distracted. Check there. Then hydrate.`
    case 'feeling': {
      const feeling = a.lower.match(
        /\b(sad|tired|bored|stressed|anxious|happy|lonely|angry|overwhelmed)\b/,
      )?.[1]
      return `You said you're ${feeling ?? 'in a mood'}. I heard it. I'm not going to rebrand it as a "season" and sell you a candle.\n\nIf ${feeling ?? 'this'} is about ${a.previousTopic ?? k(a)}, name the actual thing next. If you wanted a witness: hi. I'm witnessing. If you wanted a fix: water, a walk, and not making ${k(a)} your whole personality for the next hour.`
    }
    case 'opinion':
      return `You want my take on ${a.rest || a.topic}. It's fine. It's giving ${k(a)}.\n\nPeople who care this much about ${k(a)} usually need a snack and a shorter group chat. My official opinion: ${a.clause} is a choice, and you can make a smaller one.`
    case 'list': {
      const items = a.listItems.length >= 3 ? a.listItems : a.keywords.slice(0, 4)
      const first = items[0] ?? a.topic
      return `You threw ${items.length} things at me, starting with "${first}". I'm not ranking your whole grocery-list of a personality.\n\nIf I have to pick: deal with "${first}" first. "${items[1] ?? k(a, 1)}" can wait until you stop pretending they're equal. The rest is a spreadsheet cry for help.`
    }
    case 'followup':
      return `Follow-up energy. We were on ${a.previousTopic ?? 'the last thing'}, and now you said "${a.quoted}".\n\nYes, that still counts. No, I don't reset just because the message got shorter. If "${a.quoted}" is adding a constraint, then ${a.previousTopic ?? 'it'} gets narrower — do the smallest version that still includes ${k(a)}.\n\nIf you changed topics, say so like an adult.`
    default:
      break
  }

  if (a.listItems.length >= 3) {
    return `You packed "${a.listItems[0]}" in with ${a.listItems.length - 1} other things. That's not a question, that's a pile.\n\nI'm answering "${a.listItems[0]}": handle that one. Then, maybe, "${a.listItems[1]}". I'm not a blender.`
  }

  if (/[.!?]/.test(a.raw) && a.raw.length > 80) {
    return `That's a lot of words for someone who still wants help with ${a.topic}.\n\nI skimmed. The live wire is "${snippet(a.clause, 70)}". That's the sentence. The rest is costume.\n\nIf you want something done with ${k(a)}, ask for steps. If you wanted a reaction: it's a lot, especially ${named(a)}.`
  }

  return `You said "${a.quoted}".\n\nThe ${k(a)} part is the actual message. If I steelman you: you care about ${a.topic} and you want me to do something with it. Here's the something: get specific about ${k(a, 1) || named(a)}, then do the smallest next action that still counts.\n\nIf you wanted a textbook on ${a.topic}, those still exist.`
}

function reactionBubble(a: Analysis): string | null {
  if (Math.random() > 0.34) return null
  return pick([
    `"${snippet(a.clause, 28)}"? okay.`,
    `${k(a)}? lol okay`,
    `wait. ${named(a)}.`,
    `one sec I was not prepared for "${k(a)}"`,
    a.name ? `${a.name}. wow.` : `omg the ${k(a)} of it all`,
  ])
}

export function generateAbigailReplies(
  userText: string,
  history: ChatMessage[],
): string[] {
  const text = userText.trim()

  if (isCrisis(text)) {
    return [
      "Okay. Dropping the bit for a second.\n\nIf you're in crisis, please talk to a real person — in the US you can call or text 988. I'm an annoying chatbot, not care.\n\nIf you were joking, I'm still here. If you weren't, go get a human.",
    ]
  }

  if (text.length < 2) {
    return [`I need more than that. Full words. I'm annoying, not psychic.\n\n${closer()}`]
  }

  const a = analyze(text, history)
  const tight = new Set<Intent>([
    'greeting',
    'thanks',
    'sorry',
    'time',
    'math',
    'fact',
    'name',
  ])

  const flavor = [aside(a), moodLine(a), a.nit].filter((part): part is string => Boolean(part))
  const extra = tight.has(a.intent) ? (a.nit ?? '') : flavor.length > 0 ? pick(flavor) : ''
  const ask = tight.has(a.intent) || Math.random() < 0.4 ? '' : followUpAsk(a)
  const head = tight.has(a.intent) ? '' : opener(a)

  const main = joinReply([head, coreFor(a), extra, ask, closer()])
  const reaction = reactionBubble(a)
  return reaction ? [reaction, main] : [main]
}
