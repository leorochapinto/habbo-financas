// Formulário GET: o período vai para a URL, então dá para favoritar/compartilhar um relatório.
export function FiltroPeriodo({
  de,
  ate,
  children,
}: {
  de: string;
  ate: string;
  children?: React.ReactNode;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3">
      <label>
        <span className="rotulo">De</span>
        <input type="date" name="de" defaultValue={de} className="campo" />
      </label>
      <label>
        <span className="rotulo">Até</span>
        <input type="date" name="ate" defaultValue={ate} className="campo" />
      </label>
      {children}
      <button className="botao">Filtrar</button>
    </form>
  );
}
