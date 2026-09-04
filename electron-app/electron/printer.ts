import { printer as ThermalPrinter, types as PrinterTypes } from "node-thermal-printer";

/**
 * Prints raw text content to a Windows/macOS system printer by name.
 * Uses node-thermal-printer's generic "printer:<name>" interface, which shells
 * out to the OS print spooler — works with most USB/network ESC-POS thermal
 * printers (XPrinter, etc.) once installed as a system printer.
 */
export async function printReceipt(
  printerName: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  if (!printerName) {
    return { success: false, error: "Printer tanlanmagan" };
  }

  try {
    const device = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `printer:${printerName}`,
      removeSpecialCharacters: false,
    });

    device.alignCenter();
    for (const line of content.split("\n")) {
      device.println(line);
    }
    device.cut();

    await device.execute();
    return { success: true };
  } catch (err) {
    console.error(`[Printer] Failed to print to "${printerName}"`, err);
    return { success: false, error: err instanceof Error ? err.message : "Chop etishda xatolik" };
  }
}
