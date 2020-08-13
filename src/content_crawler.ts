interface FoundCommand {
    command: string, 
    groups: string[],
    indexBefore: number,
    indexAfter: number,
}

function* regexIterator(text: string, re: RegExp) {
    let matchArray = re.exec(text);

    while (matchArray !== null) {
        yield matchArray;
        matchArray = re.exec(text);
    }
}

function objectFromMatch(matchArray: RegExpExecArray, regex: RegExp): FoundCommand {
    const [ command, ...groups ] = matchArray;
    return { 
        command, 
        groups, 
        indexBefore: regex.lastIndex - command.length,
        indexAfter: regex.lastIndex, 
    }
}

export function crawl(content: string, search: RegExp): FoundCommand[] {
    const matches = regexIterator(content, search);
    const commands: FoundCommand[] = []

    for (const matchArray of matches) {
        commands.push(objectFromMatch(matchArray, search));
    }

    return commands;
}

export function crawlSingle(content: string, search: RegExp): FoundCommand | null {
    const matches = regexIterator(content, search);
    const matchArray = matches.next();

    if (matchArray.value) {
        return objectFromMatch(matchArray.value, search);
    } else {
        return null;
    }
}