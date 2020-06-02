import { LogRecord } from "../types.ts";
import { levelMap, Level } from "../levels.ts";

const formatStr = "{dateTime} {level} {msg} {metadata}";
let lastLogMessage = '';
const times: number[] = [];
for(let i=0; i < 100; i++) {
  const start = new Date();
  const lr = new LogRecord(i, [], Level.INFO);
  for (let j=0; j < 100000; j++) {
    lastLogMessage = format3(lr);
  }
  times.push(new Date().getTime() - start.getTime());
}
console.log(lastLogMessage);
console.log("Avg: ", (times.reduce((prev, curr) => prev+=curr)) / times.length);

// Average run of 10k formats is 147ms
function format3(logRecord: LogRecord): string {
  return asString(logRecord.dateTime) + " " 
      + (levelMap.get(logRecord.level)?.padEnd(8, ' ') || 'UNKNOWN') + " " 
      + asString(logRecord.msg) + " "
      + asString(logRecord.metadata);
}


// Average run of 10k formats is 294ms
function format2(logRecord: LogRecord): string {
  let msg = formatStr.replace('{dateTime}', asString(logRecord.dateTime));
  msg = msg.replace('{level}', levelMap.get(logRecord.level)?.padEnd(8, ' ') || 'UNKNOWN');
  msg = msg.replace('{msg}', asString(logRecord.msg));
  msg = msg.replace('{metadata}', asString(logRecord.metadata));
  return msg;
}

// Average run of 10k formats is 405ms
function format(logRecord: LogRecord): string {
  let formattedMsg = formatStr.replace(/{(\S+)}/g, (match, p1): string => {
    const value = logRecord[p1 as keyof LogRecord];
  
    // don't replace missing values
    if (!value) return match;
    else if (p1 === "level") return levelMap.get(value as number)?.padEnd(8, ' ') || 'UNKNOWN';
    else if (p1 === 'metadata' && logRecord.metadata.length === 0) return '';
    else return asString(value);
  });

  return formattedMsg;
}

function asString(data: unknown): string {
  if (typeof data === "string") {
    return data;
  } else if (
    data === null ||
    typeof data === "number" ||
    typeof data === "bigint" ||
    typeof data === "boolean" ||
    typeof data === "undefined"
  ) {
    return `${data}`;
  } else if (typeof data === "symbol") {
    return String(data);
  } else if (typeof data === "function") {
    return "undefined";
  } else if (data instanceof Date) {
    return data.toISOString();
  } else if (typeof data === "object") {
    return JSON.stringify(data);
  }
  return "undefined";
}
