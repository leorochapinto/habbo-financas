# Finanças do Hotel

Gestão de entradas, saídas e perdas de um hotel Habbo, com entrada automática de pagamentos do PicPay.

## O que faz

- **Painel**: entradas, saídas, perdas e saldo do período, gráfico por dia e quem mais comprou.
- **Lançamentos**: lista com filtro por período, tipo, categoria e busca por descrição ou nick. Entrada, saída ou perda manual em um formulário.
- **Perdas**: tipo próprio de lançamento (golpe, comprovante falso, calote, estorno), separado das despesas normais, para o relatório mostrar quanto se perdeu e não só quanto se gastou.
- **Relatórios**: mês a mês, por categoria, por jogador, margem e perdas sobre entradas. Exporta CSV que abre direto no Excel.
- **PicPay**:
  - *Cobrança*: gera link de pagamento. Quando o jogador paga, o PicPay avisa o sistema e a entrada é lançada sozinha, com nick e produto. Estorno e chargeback viram perda automaticamente.
  - *Extrato*: importa o CSV do extrato para pegar Pix e transferências que não passaram por uma cobrança. Reimportar o mesmo arquivo não duplica.

## Rodar

```bash
pnpm install
cp .env.example .env    # sem PICPAY_TOKEN roda em modo simulado
pnpm dev                # http://localhost:3000
```

Requer Node 22.5 ou mais novo (o banco é o SQLite embutido no Node, `node:sqlite`). O arquivo fica em `data/financas.db`: faça backup dele.

## Ligar o PicPay de verdade

1. A integração usa a **API de E-commerce do PicPay**, que exige conta **PicPay Empresas** (lojista). Conta pessoal não tem API: nesse caso use só a importação de extrato.
2. No painel do lojista, pegue o `x-picpay-token` e o `x-seller-token` e coloque em `PICPAY_TOKEN` e `PICPAY_SELLER_TOKEN`.
3. Publique o sistema num endereço público com HTTPS e coloque em `APP_URL`. O PicPay chama `APP_URL/api/picpay/callback` a cada mudança de pagamento.
4. O retorno do PicPay não é aceito de olhos fechados: o sistema confere o `x-seller-token` e depois consulta o status na API antes de lançar.

## Hospedagem

SQLite precisa de disco persistente: VPS, Railway ou Fly.io com volume. Vercel não serve (o disco é apagado a cada deploy). Defina `APP_SENHA` antes de expor na internet.

## Estrutura

```
src/lib/db.ts           esquema do banco e categorias iniciais
src/lib/lancamentos.ts  consultas e totais
src/lib/picpay.ts       cliente PicPay + modo simulado
src/lib/extrato.ts      importação de CSV
src/app/actions.ts      ações dos formulários
src/app/api/picpay/callback  retorno do PicPay
src/proxy.ts            senha de acesso
```
