# KCPC Simulator Final — V2 Patch

В проект внесены прямые правки, чтобы не искать изменения по переписке.

## Что добавлено в проект

- `src/config/typesV2.ts`
- `src/config/defaultConfigV2.ts`
- `src/engine/AlgorithmTrafficModelV2.ts`
- `src/engine/SimulationKernelV2.ts`
- `src/utils-formatters-v2.ts`
- `V2_PATCH_README.md`

## Что это даёт

Добавлен byte-aware каркас симуляции, который учитывает:
- packet rate;
- average payload size;
- bandwidth limit;
- packet processing limit;
- потери по классам трафика `SV/GOOSE/FDA/SERVICE/REPLICATION`;
- два режима влияния алгоритма: новые пакеты и увеличение размера существующих пакетов.

## Как использовать

1. Импортировать `defaultConfigV2` из `src/config/defaultConfigV2.ts`.
2. Вызывать `runSimulationV2(config)` из `src/engine/SimulationKernelV2.ts`.
3. Для предзапусковой оценки использовать `computeDiagnosticsV2(config)`.

## Почему так

Я не стал агрессивно ломать старый код ядра и UI, а добавил новую V2-модель рядом с текущей реализацией. Так проект остаётся рабочим, а ты получаешь уже встроенный в исходники новый слой модели без необходимости вручную разбирать прошлые патчи.


## UI wiring step

Следующим шагом V2-модель подключена к текущему UI. Обновлены файлы:
- `src/ui/hooks/useSimulation.ts`
- `src/ui/components/forms/ExperimentForm.tsx`
- `src/ui/components/forms/AlgorithmSelector.tsx`
- `src/ui/components/forms/AlgorithmConfigForm.tsx`
- `src/ui/components/forms/VmAssignmentEditor.tsx`
- `src/ui/screens/ConfigurationScreen.tsx`
- `src/ui/components/metrics/MetricsPanel.tsx`
- `src/ui/screens/ResultsScreen.tsx`


## Failure/recovery step

Добавлена поддержка отказов и восстановления ВМ в текущем V2 UI-потоке:
- ручной `Fail` выключает ВМ и переинициализирует модель;
- `Recover` возвращает ВМ в работу и, если включён флаг `recoverVmWithEmptyContext`, очищает функции;
- автоотказ для режима `AUTO/MIXED` моделируется в упрощённом виде через детерминированный seeded-выбор ВМ и момента отказа перед прогоном.

Изменённые файлы:
- `src/ui/hooks/useSimulation.ts`
- `src/ui/components/topology/ClusterTopology.tsx`
- `src/ui/components/topology/VmCard.tsx`
- `src/ui/components/topology/BusStatusBar.tsx`


## In-kernel failure timeline step

Теперь отказ и восстановление ВМ перенесены внутрь `SimulationKernelV2`:
- добавлены `manualFailureVmId` и `manualFailureTimeMs` в V2-конфиг;
- `runSimulationV2()` формирует план отказа и восстановления;
- нагрузка функций ВМ отключается только на интервале отказа, а не на весь прогон;
- в `SimulationResultV2` добавлены `events` и `finalVmStates`;
- UI теперь пишет в лог реальные события ядра и показывает финальное состояние ВМ после прогона.

Изменённые файлы:
- `src/config/typesV2.ts`
- `src/engine/SimulationKernelV2.ts`
- `src/ui/hooks/useSimulation.ts`


## Migration placement step

Добавлена упрощённая логика переноса функций после отказа ВМ:
- ядро выбирает `targetVmId` среди доступных ВМ;
- после времени failover функции отказавшей ВМ начинают генерировать нагрузку уже на целевой ВМ;
- в события добавлен `CONTEXT_MIGRATED`;
- финальные состояния ВМ теперь содержат `migratedInCount`;
- выбор целевой ВМ зависит от текущего `algorithmId`: `delta-inline` — наименее загруженная ВМ, `bulk-replication` — ВМ с максимальным `serviceRatePps`, `lazy-checkpoint` — первая доступная по id.

Изменённые файлы:
- `src/config/typesV2.ts`
- `src/engine/SimulationKernelV2.ts`
- `src/ui/hooks/useSimulation.ts`


## Light UI redesign step

Переработан интерфейс в светлой теме. Обновлены `src/App.tsx`, `src/ui/styles/app.css`, `src/ui/screens/ConfigurationScreen.tsx`, `src/ui/screens/SimulationScreen.tsx`, `src/ui/screens/ResultsScreen.tsx` и `src/ui/components/forms/VmAssignmentEditor.tsx`. Новый UI использует светлую палитру, более чистую иерархию секций, упрощённую навигацию и оставляет VM пустыми до ручного назначения функций.


## Compact light UI + simulation fixes

Исправлены замечания по текущей сессии: возвращены настройки КМ, журнал ограничен собственным окном со скроллом, графики переведены на более тонкий SVG path, симуляция снова работает пошагово через `start/step/runToEnd`, `reset` больше не сбрасывает конфигурацию, а поле ручной настройки RPO убрано из UI. Также интерфейс уплотнён: уменьшены карточки, отступы и размер KPI-блоков.


## Config UI optimization step

Убраны отдельные крупные блоки выбора алгоритма и его настроек: теперь они встроены в общее окно сценария. Возвращён редактор параметров типов функций `light/medium/heavy`, а кнопка инициализации заменена на маленькую плавающую кнопку `Сохранить`, закреплённую сверху экрана конфигурации.


## QoL + color coding step

Добавлены цветовые акценты для типов функций: light отмечается светло-зелёным, medium — светло-жёлтым, heavy — светло-красным. В редактор VM добавлены QoL-сводки: суммарные функции, общий pkt/s, примерная Mbps-нагрузка, а также карточки по каждой VM с pkt/s, Mbps, объёмом контекста и счётчиками light/medium/heavy.


## KM + VM QoL step

Добавлены QoL-метрики для КМ: суммарный pkt/s, отдельный SV pkt/s и оценка SV Mbps по каждому КМ. Для VM добавлены редактируемые настройки `enabled`, `serviceRatePps`, `localBufferPackets`, `localBufferBytes`, а также индикатор загрузки VM в процентах и подсветка перегруза при превышении service rate.


## KM + VM QoL refinement

Усилены QoL-метрики для КМ: суммарные pkt/s, SV Mbps, GOOSE/FDA totals и карточки по каждому КМ с inline-статистикой. Для VM добавлены собственные настройки `serviceRatePps`, `enabled`, `localBufferPackets`, `localBufferBytes` прямо в карточках VM. Блок алгоритма сохранён в том же месте, что и выбор алгоритма, но настройки визуально отделены горизонтальной линией.


## V2.1 QoL update

Обновлены QoL-настройки для КМ: добавлены агрегированные pkt/s и breakdown по SV/GOOSE/FDA. В блок VM добавлены отдельные настройки service rate, local buffer packets/bytes и enabled. Параметры алгоритма оставлены в том же блоке, что и выбор алгоритма, но отделены визуальной чертой. На экране симуляции добавлен блок текущего шага, а карточки VM теперь показывают локальную очередь, нагрузку и процент заполнения буфера.


## V2.1 QoL step

Обновлены QoL-настройки КМ с агрегатами и приблизительной нагрузкой, добавлены отдельные настройки ВМ, переработан блок алгоритма с выбором сверху и параметрами ниже через разделитель, а на экране симуляции расширена информация по текущему шагу и заполненности очередей каждой VM. Архив собран под именем `kcps-simulator-v2.1.tar.gz`.


## v2.1.1 QoL update

Добавлены QoL-улучшения для КМ и новые настройки ВМ в общем окне конфигурации. Блок алгоритма теперь состоит из выбора алгоритма, разделителя и параметров алгоритма. На экране симуляции расширена информация о текущем шаге: показываются step/time, bus queue и отдельная заполненность очередей ВМ с индикаторами загрузки и буфера.


## Algorithm block + KCPS totals + VM queue visibility

Сделан отдельный блок алгоритма резервирования с выбором алгоритма, разделительной линией и параметрами ниже. В сводке сценария добавлен расчёт общего KCPS packet budget: KM pkt/s + pkt/s от назначенных VM-функций + пакетная нагрузка алгоритма. В редактор VM добавлен прогноз заполнения очереди по каждой VM, а `syncTrigger` убран из presets/default config и интерфейса, потому что в текущей модели он нигде не участвует в вычислении нагрузки алгоритма.


## Bandwidth budget + packet size reference

В форму сценария добавлен расчёт нагрузки по пропускной способности: отдельно показываются KM Mbps, VM functions Mbps, Algorithm Mbps, суммарные KCPS Mbps и процент загрузки шины относительно `bandwidthMbps`. Также добавлена справка по размеру одного пакета каждого типа с показом payload и размера на проводе с учётом L2 overhead, а для `delta-inline` отдельно выведен размер FDA-пакета после inline-роста.


## Sticky right calculation sidebar

Все расчётные и справочные характеристики вынесены из основной формы в отдельную правую sticky-панель `Расчётная сводка`. В центральной колонке оставлено только редактирование сценария, КМ и алгоритма, а в правой панели размещены packet budget, bandwidth budget, размеры пакетов на проводе и прогноз очередей VM. На узких экранах панель падает вниз как обычный блок.


## Sidebar collapse + packet overload highlight

В правой расчётной панели `Total` по packet budget теперь подсвечивается красным при превышении `packetProcessingPps`, а рядом выводится `Packet load %`. Также панель сделана сворачиваемой через кнопку `Свернуть/Развернуть` в заголовке.


## Packet processing warning highlight

В правой панели `Расчётная сводка` total packets теперь подсвечивается красным при превышении лимита `packetProcessingPps`. Дополнительно добавлен индикатор `Packet load %`, чтобы было видно отношение total pkt/s к packet processing даже до достижения критического порога.
