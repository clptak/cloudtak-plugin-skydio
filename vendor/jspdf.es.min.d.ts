export class jsPDF {
    constructor(options?: { unit?: string; format?: string | number[] });

    addPage(): void;
    setFillColor(r: number, g: number, b: number): void;
    rect(x: number, y: number, w: number, h: number, style?: string): void;
    setTextColor(r: number, g: number, b: number): void;
    setFont(family: string, style?: string): void;
    setFontSize(size: number): void;
    text(
        text: string | string[],
        x: number,
        y: number,
        options?: { align?: string },
    ): void;
    roundedRect(
        x: number,
        y: number,
        w: number,
        h: number,
        rx: number,
        ry: number,
        style?: string,
    ): void;
    setDrawColor(r: number, g: number, b: number): void;
    setLineWidth(width: number): void;
    line(x1: number, y: number, x2: number, y2: number): void;
    splitTextToSize(text: string, maxWidth: number): string[];
    getNumberOfPages(): number;
    setPage(page: number): void;
    output(type: 'datauristring'): string;
}
