export enum Style {
    normal = "",
    error = "31;1m",
    warning = "33;1m",
    success = "32;1m",
    visual = "30;1m",
};

export function printLine(msg: string, style: Style = Style.normal) {
    const color = style === "" ? "" : `\u001b[${style}`;
    console.log(`${color}${msg}\u001b[0m`);
}

export function printTable(rows: string[][]) {
    const columnsWidth = rows[0].map(cell => cell.length);
    rows.forEach(row => row.forEach((cell, i) => {
        if (cell.length > columnsWidth[i]) {
            columnsWidth[i] = cell.length;
        };
    }));
    
    rows.forEach((row, r) => {
        const text = row.reduce((prev, curr, c) => {
            const indent = c < row.length - 1
                ? columnsWidth[c] + 3 - curr.length
                : 0;
            return prev + curr + " ".repeat(indent);
        }, "");
        printLine(text);

        if (r == 0) {
            printLine("-".repeat(text.length), Style.visual);
        }
    });
}