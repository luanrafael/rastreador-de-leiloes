const fs = require("fs");

let filtros = {}
try {
    filtros = require("./filtros.json")
} catch (error) {
    console.warn("filtros.json nao encontrado")
}


const ENDPOINT_BASE = "http://www25.receita.fazenda.gov.br/sle-sociedade/api/"
const ENDPOINT_BASE_EDITAL = `${ENDPOINT_BASE}edital/`
const ENDPOINT_BASE_PORTAL = `${ENDPOINT_BASE}portal/`


const BASE_LINK_EDITAL = "http://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/"

const recuperarEditais = async () => {

    const json_data = await _get(ENDPOINT_BASE_PORTAL)

    const leiloes_em_aberto = json_data.situacoes.filter( situacao => situacao.codigoSituacao < 5)

    const editais = leiloes_em_aberto.reduce((prevValues, leilao) => prevValues.concat(leilao.lista), [])

    return editais
}

const _get = async (url) => {
    console.log("url", url)
    const response = await fetch(`${url}`, {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "Referer": "http://www25.receita.fazenda.gov.br/sle-sociedade/portal",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      },
      "body": null,
      "method": "GET"
    })

    return response.json()
}

const recuperarLotes = async (editais, filtros) => {
    const lotes = {}
    const tipos = []
    for (let index = 0; index < editais.length; index++) {
        const edital = editais[index];        
        const dados_edital = await _get(`${ENDPOINT_BASE_EDITAL}${edital.edital}`)
        
        const match = (lote) => {
            if (tipos.indexOf(lote.tipo) == -1) {
                tipos.push(lote.tipo)
            }
            if (filtros['tipo'] && lote.tipo !== filtros.tipo) {
                return false
            }
            
            console.log(filtros.tipo, lote.tipo)
            console.log(filtros.valor, lote.valorMinimo)
            if (filtros['valor'] &&  filtros.valor <= lote.valorMinimo) {
                return false
            }
            
            lote.link_lote = `${BASE_LINK_EDITAL}${edital.edital}/lote/${lote.nrAtribuido}`
            console.log('>>>')

            return true
        }

        const lotes_encontrados = dados_edital.lotes.filter(match)

        if (lotes_encontrados.length > 0) {
            lotes[edital.edital] = {
                link: `${BASE_LINK_EDITAL}${edital.edital}`,
                lotes_encontrados
            }
        }

    }

    return lotes

}

const main = async () => {

    const editais = await recuperarEditais()
    console.log(editais)
    const data = await recuperarLotes(editais, filtros || {})

    fs.writeFileSync("./resultado.json", JSON.stringify(data, 2));
}

main()