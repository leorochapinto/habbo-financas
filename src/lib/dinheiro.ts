const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(centavos: number): string {
  return formatador.format(centavos / 100);
}

/**
 * Converte texto digitado ("1.234,56", "1234.56", "R$ 10", "-25,90") em centavos.
 * Devolve null se não for um número válido.
 */
export function paraCentavos(texto: string): number | null {
  let limpo = texto.replace(/[R$\s]/g, "");
  if (!limpo) return null;
  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");
  if (temVirgula && temPonto) {
    // o último separador que aparece é o decimal
    limpo =
      limpo.lastIndexOf(",") > limpo.lastIndexOf(".")
        ? limpo.replace(/\./g, "").replace(",", ".")
        : limpo.replace(/,/g, "");
  } else if (temVirgula) {
    limpo = limpo.replace(",", ".");
  }
  const numero = Number(limpo);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100);
}

export function hojeISO(): string {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
