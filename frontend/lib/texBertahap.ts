// Pemotongan TeX per token untuk animasi "rumus diketik". Murni string (tanpa KaTeX) supaya
// komponen animasi bisa menghitung jumlah token tanpa ikut memuat KaTeX.

export function pecahToken(tex: string): string[] {
  return tex.match(/\\[a-zA-Z]+|\\.|./g) ?? [];
}

// Menutup kurung kurawal dan \left yang belum berpasangan pada potongan TeX supaya bisa dirender.
export function seimbangkan(potongan: string): string {
  let buka = 0;
  let kiri = 0;
  for (const t of pecahToken(potongan)) {
    if (t === "{") buka++;
    else if (t === "}") buka--;
    else if (t === "\\left") kiri++;
    else if (t === "\\right") kiri--;
  }
  return potongan.replace(/[\^_]\s*$/, "") + "}".repeat(Math.max(buka, 0)) + "\\right.".repeat(Math.max(kiri, 0));
}
