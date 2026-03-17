export type ParsedMediaFilename = {
  title: string;
  mediaDate: string;
  service: string;
  speaker: string;
};

type ServiceMatcher = {
  service: string;
  pattern: RegExp;
};

const HONORIFIC_PATTERN =
  /\b(?:pastor|pst|pst\.|bishop|dr|dr\.|rev|rev\.|apostle|evang|evang\.|evangelist|minister|dcn|dcn\.|deacon)\b/gi;

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const SERVICE_MATCHERS: ServiceMatcher[] = [
  {
    service: "Week of Spiritual Emphasis - Day 1",
    pattern:
      /\b(?:wose[\s._-]*day[\s._-]*1|wose[\s._-]*d[\s._-]*1|wose[\s._-]*1|week[\s._-]*of[\s._-]*spiritual[\s._-]*emphasis[\s._-]*day[\s._-]*1)\b/i,
  },
  {
    service: "Week of Spiritual Emphasis - Day 2",
    pattern:
      /\b(?:wose[\s._-]*day[\s._-]*2|wose[\s._-]*d[\s._-]*2|wose[\s._-]*2|week[\s._-]*of[\s._-]*spiritual[\s._-]*emphasis[\s._-]*day[\s._-]*2)\b/i,
  },
  {
    service: "Week of Spiritual Emphasis - Day 3",
    pattern:
      /\b(?:wose[\s._-]*day[\s._-]*3|wose[\s._-]*d[\s._-]*3|wose[\s._-]*3|week[\s._-]*of[\s._-]*spiritual[\s._-]*emphasis[\s._-]*day[\s._-]*3)\b/i,
  },
  {
    service: "Sunday First Service",
    pattern:
      /\b(?:sfs|sunday[\s._-]*first(?:[\s._-]*service)?|first[\s._-]*service|1st[\s._-]*(?:service|svc))\b/i,
  },
  {
    service: "Sunday Second Service",
    pattern:
      /\b(?:sss|sunday[\s._-]*second(?:[\s._-]*service)?|second[\s._-]*service|2nd[\s._-]*(?:service|svc))\b/i,
  },
  {
    service: "Sunday Third Service",
    pattern:
      /\b(?:sts|sunday[\s._-]*third(?:[\s._-]*service)?|third[\s._-]*service|3rd[\s._-]*(?:service|svc))\b/i,
  },
  {
    service: "Midweek Service",
    pattern: /\b(?:mws|midweek(?:[\s._-]*service)?|mid[\s._-]*week(?:[\s._-]*service)?)\b/i,
  },
  {
    service: "Special Program",
    pattern: /\b(?:special[\s._-]*program|sp)\b/i,
  },
];

function stripExtension(filename: string): string {
  return String(filename || "").replace(/(?:\.(?:mp3|mpeg|wav|m4a|aac|ogg))+$/i, "");
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForComparison(value: string): string {
  return collapseWhitespace(
    value
      .toLowerCase()
      .replace(HONORIFIC_PATTERN, " ")
      .replace(/[^a-z0-9]+/g, " "),
  );
}

function cleanupTitle(value: string): string {
  return collapseWhitespace(
    value
      .replace(/[_|]+/g, " ")
      .replace(/[()[\]{}]+/g, " ")
      .replace(/\s*-\s*/g, " ")
      .replace(/^\d+\s*[.)-]?\s*/g, "")
      .replace(/\bby\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s.,/\\-]+|[\s.,/\\-]+$/g, ""),
  );
}

function toTitleCase(value: string): string {
  return collapseWhitespace(
    value
      .toLowerCase()
      .split(" ")
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
      .join(" "),
  );
}

function padNumber(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return `${year}-${padNumber(month)}-${padNumber(day)}`;
}

function monthIndex(monthName: string): number {
  const normalized = monthName.toLowerCase();

  return MONTH_NAMES.findIndex(
    (entry) => entry === normalized || entry.startsWith(normalized),
  ) + 1;
}

function extractDate(baseName: string): { mediaDate: string; matchedText: string } {
  const patterns = [
    // Supports YYYY-MM-DD and YYYY/MM/DD.
    /\b(20\d{2})[-_. \/](0?[1-9]|1[0-2])[-_. \/](0?[1-9]|[12]\d|3[01])\b/,
    // Supports DD-MM-YYYY and DD/MM/YYYY.
    /\b(0?[1-9]|[12]\d|3[01])[-_. \/](0?[1-9]|1[0-2])[-_. \/](20\d{2})\b/,
    /\b(20\d{2})(0[1-9]|1[0-2])([0-3]\d)\b/,
    /\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?[\s._-]+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s._-]+(20\d{2})\b/i,
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s._-]+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?[\s._-]+(20\d{2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = baseName.match(pattern);

    if (!match) {
      continue;
    }

    let year = 0;
    let month = 0;
    let day = 0;

    if (pattern === patterns[0]) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else if (pattern === patterns[1]) {
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    } else if (pattern === patterns[2]) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else if (pattern === patterns[3]) {
      day = Number(match[1]);
      month = monthIndex(match[2]);
      year = Number(match[3]);
    } else {
      month = monthIndex(match[1]);
      day = Number(match[2]);
      year = Number(match[3]);
    }

    const mediaDate = toIsoDate(year, month, day);

    if (mediaDate) {
      return {
        mediaDate,
        matchedText: match[0],
      };
    }
  }

  return {
    mediaDate: "",
    matchedText: "",
  };
}

function extractService(baseName: string): { service: string; matchedText: string } {
  for (const matcher of SERVICE_MATCHERS) {
    const match = baseName.match(matcher.pattern);

    if (match) {
      return {
        service: matcher.service,
        matchedText: match[0],
      };
    }
  }

  // Plain "WOSE" should default to Day 1 when no day is specified.
  const impliedWoseDayTwo = baseName.match(/\bwose\b/i);

  if (impliedWoseDayTwo) {
    return {
      service: "Week of Spiritual Emphasis - Day 1",
      matchedText: impliedWoseDayTwo[0],
    };
  }

  return {
    service: "",
    matchedText: "",
  };
}

function buildSpeakerMatcher(name: string): RegExp | null {
  const normalizedName = normalizeForComparison(name);

  if (!normalizedName) {
    return null;
  }

  const parts = normalizedName.split(" ").filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return new RegExp(
    `\\b(?:(?:pastor|pst|bishop|dr|rev|apostle|evang|evangelist|minister|dcn|deacon)[\\s._-]+)?${parts.join("[\\s._-]+")}\\b`,
    "i",
  );
}

function extractSpeaker(baseName: string, speakerNames: string[]): string {
  const bySpeakerMatch = baseName.match(/\bby[\s._-]+(?:pastor|pst|bishop|dr|rev|apostle|evang|evangelist|minister|dcn|deacon)[\s._-]+(.+)$/i);

  if (bySpeakerMatch) {
    const speakerTail = cleanupTitle(bySpeakerMatch[1])
      .replace(/\b(20\d{2}[-/ ._](?:0?[1-9]|1[0-2])[-/ ._](?:0?[1-9]|[12]\d|3[01])|(?:0?[1-9]|[12]\d|3[01])[-/ ._](?:0?[1-9]|1[0-2])[-/ ._](20\d{2}))\b/gi, " ")
      .replace(/\b(?:sfs|sss|sts|mws|wose(?:[\s._-]*day[\s._-]*[123])?|sp)\b/gi, " ");

    const cleanedSpeaker = toTitleCase(cleanupTitle(speakerTail));

    if (cleanedSpeaker) {
      const matchedExistingSpeaker = speakerNames.find(
        (name) => normalizeForComparison(name) === normalizeForComparison(cleanedSpeaker),
      );

      return matchedExistingSpeaker || cleanedSpeaker;
    }
  }

  const matchedSpeaker = speakerNames
    .map((name) => ({
      name,
      matcher: buildSpeakerMatcher(name),
      score: normalizeForComparison(name).split(" ").length,
      length: normalizeForComparison(name).length,
    }))
    .filter((entry) => entry.matcher && entry.matcher.test(baseName))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.length - left.length;
    })[0];

  return matchedSpeaker?.name || "";
}

function stripSpeakerFromTitle(value: string, speaker: string): string {
  const matcher = buildSpeakerMatcher(speaker);

  if (!matcher) {
    return value;
  }

  return value.replace(matcher, " ");
}

function stripTrailingMetadata(value: string, speaker: string, mediaDate: string, service: string): string {
  let result = value;

  if (speaker) {
    result = stripSpeakerFromTitle(result, speaker);
  }

  if (mediaDate) {
    result = result.replace(new RegExp(mediaDate.replace(/[-/]/g, "[-/ ]"), "gi"), " ");
  }

  if (service) {
    const matcher = SERVICE_MATCHERS.find((entry) => entry.service === service);

    if (matcher) {
      result = result.replace(matcher.pattern, " ");
    }
  }

  return cleanupTitle(result);
}

export function parseMediaMetadataFromFilename(
  filename: string,
  speakerNames: string[],
): ParsedMediaFilename {
  const baseName = cleanupTitle(stripExtension(filename));
  const { mediaDate, matchedText: matchedDate } = extractDate(baseName);
  const withoutDate = matchedDate ? cleanupTitle(baseName.replace(matchedDate, " ")) : baseName;
  const { service, matchedText: matchedService } = extractService(withoutDate);
  const withoutService = matchedService ? cleanupTitle(withoutDate.replace(matchedService, " ")) : withoutDate;
  const speaker = extractSpeaker(withoutService, speakerNames);
  const withoutBySpeaker = cleanupTitle(
    withoutService.replace(/\bby[\s._-]+(?:pastor|pst|bishop|dr|rev|apostle|evang|evangelist|minister|dcn|deacon)\b.*$/i, " "),
  );
  const cleanedTitle = cleanupTitle(stripSpeakerFromTitle(withoutBySpeaker, speaker));
  const title = stripTrailingMetadata(cleanedTitle, speaker, mediaDate, service) || baseName;

  return {
    title,
    mediaDate,
    service,
    speaker,
  };
}
