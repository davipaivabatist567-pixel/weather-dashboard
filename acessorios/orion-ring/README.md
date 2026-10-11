# ORION RING — ficha do acessório

**Versão da ficha:** 0.1 · **Estágio geral: IDEIA (nenhuma peça comprada, nada montado)**

## Objetivo
Controle físico de um botão para o Orion AI, via Bluetooth (o anel se comporta como um teclado de uma tecla).

## Estado de cada parte

| Parte | Estágio | Observação |
|---|---|---|
| Lado do Orion (decodificar clique, duplo e longo; ações; configuração) | **Funcional, testado** | `orion-ai/src/lib/ring.ts` e `ringDecoder.ts`; 8 testes unitários e 1 e2e com teclado do computador |
| Firmware do anel | Ideia | Ainda não escrito |
| Placa/eletrônica | Ideia | XIAO nRF52840 (recomendada) ou ESP32-C3 SuperMini; **não testadas** |
| Bluetooth com o celular (HID) | Ideia | Falta testar teclado Bluetooth real com o Orion no Chrome Android e no APK |
| Carcaça 3D | Ideia | Primeiro um controle de dedo maior, não um anel final |
| Autonomia, conforto, acionamento acidental | Não medidos | |

## Contrato entre o anel e o Orion
O anel só precisa enviar **tecla pressionada** e **tecla solta** de uma tecla configurável (padrão `F9`). Todo o resto (tempo para duplo clique 350 ms, pressão longa 600 ms) é decidido no Orion. Em Configurações → Orion Ring dá para ativar o botão e reaprender a tecla.

| Gesto | Ação no Orion |
|---|---|
| Clique | Liga/desliga o microfone (ditado; indisponível dentro do APK) |
| Duplo clique | Lê a última resposta em voz alta (ou para a leitura) |
| Pressão longa | Interrompe resposta, fala e microfone |

O anel **nunca** confirma exclusões.

## Teste hoje, sem hardware
Ative o botão em Configurações → Orion Ring, aperte `F9` no teclado (ou ensine outra tecla) e veja os comandos aparecerem na lista "Últimos comandos recebidos". Qualquer teclado Bluetooth de uma tecla serve para o teste.

## Segurança (resumo)
Bateria LiPo só com circuito de proteção; a corrente de carga da placa precisa ser menor ou igual a 1C da bateria (confirmar na documentação da placa e na ficha da bateria); nunca soldar com o circuito energizado.

## Próximos passos (aguardam sua aprovação)
Lista de compras e orçamento em R$ (preços brasileiros ainda não consultados), esquema elétrico, firmware de bancada, testes de bateria.
