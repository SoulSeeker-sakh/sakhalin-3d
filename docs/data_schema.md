# Схема геоданных и справочников 3D-карты

Эта шпаргалка позволяет в новых сессиях не читать целиком файлы с координатами и справочниками (`src/data/coastline.js`, `src/data/facilities.js`, `src/sakhalin1/far-east-terrain.js`).

## 1. Единая система координат и проекция (`src/core/state.js`)

| Параметр | Значение / единицы | Назначение |
|---|---|---|
| Входные координаты | `[lon, lat]` в градусах (`°E`, `°N`) | Географическая долгота и широта |
| `CENTER_LON`, `CENTER_LAT` | `142.85`, `50.35` (`°E`, `°N`) | Центр проекции (середина о. Сахалин) |
| `LAT_SCALE` | `25.8` ед. сцены / `1°` широты | ~`0.232` ед. сцены на 1 км (1° ≈ 111.2 км) |
| `LON_SCALE` | `LAT_SCALE * cos(50.35°)` ≈ `16.46` | Поправка масштаба по долготе |
| Функция перевода | `lonLatToXZ(lon, lat)` → `[x, z]` | Ось `+X` — восток, `+Z` — юг, `+Y` — высота |

---

## 2. Контуры береговых линий

* **`SAKHALIN_COASTLINE_LONLAT`** (`src/data/coastline.js`) — замкнутый полигон берега о. Сахалин, массив пар `[lon, lat]` (сглаживается в `SAKHALIN_OUTLINE` на 320 точек + Z-индекс `COAST_Z_BUCKETS`).
* **`FAR_EAST_COASTLINE_LONLAT`** (`src/sakhalin1/far-east-terrain.js`) — полигон материка Дальнего Востока (Хабаровский край, Приморье, ЕАО, Амурская обл.), сглаживается в `farEastOutline`.

**Пример (3 строки):**
```js
[142.71, 54.42], [142.90, 54.34], [143.05, 54.15], // п-ов Шмидта
[143.12, 53.65], [143.18, 53.40], [143.26, 53.10], // Оха, Пильтун
[143.33, 46.12], [143.32, 46.40], [143.26, 46.60]  // Залив Анива
```

---

## 3. Объекты инфраструктуры (`src/data/facilities.js`)

* **`FACILITIES_DATA`** — **12 объектов «Сахалин-2»** (`offshore`: 3, `onshore`: 5, `maritime`: 4 — маяк + 3 движущихся судна) + природные памятники острова.
* **`SAKHALIN1_FACILITIES_DATA`** — **9 объектов «Сахалин-1» и ДВ** (`offshore`: 3, `onshore`: 5, `maritime`: 1 танкер).
* **`SAKHALIN3_FACILITIES_DATA`** — **9 объектов «Сахалин-3» и МГП СХВ** (Киринское и Южно-Киринское ПДК, БТК, ГКС «Сахалин», переход через пролив Невельского, линейные КС и ГРС о. Русский).

| Поле | Тип / единицы | Описание |
|---|---|---|
| `id`, `code` | `string` | Уникальный ID (`'pa-b'`, `'s1-berkut'`) и короткая подпись на маркере |
| `name`, `shortName` | `string` | Полное и краткое название для карточки и списка |
| `category` | `'offshore' \| 'onshore' \| 'maritime'` | Вкладка фильтра (`Шельф`, `Берег`, `Флот/Маяк`) |
| `markerColor` | `HEX string` | Цвет маркера и кольца выделения |
| `geoLonLat` | `[lon, lat]` (`°E`, `°N`) | Координаты объекта; `position` (`THREE.Vector3`) вычисляется при сборке |
| `specs` | `Array<{ label, value }>` | 4 характеристики в карточке (глубина в м, мощность в млн т/г, млн м³/сут и т.д.) |
| `subTabs` | `Array<object>` (опц.) | Подвкладки внутри одной карточки (например, `БКП «Чайво»` + `БУ «Ястреб»`) |
| `isMovingShip`, `routeWaypoints`, `dockStops` | `boolean`, `Array` (опц.) | Маршрут судна (`[lon, lat]`), скорость (`cruiseKnots`, узлы) и точки стоянки/погрузки |
| `url` | `string` | Внешняя ссылка (переопределяется пользователем в `localStorage['sakhalin2_custom_urls']`) |

**Пример (3 объекта, сокращённо):**
```js
{ id: 'pa-b', code: 'ПА-Б', category: 'offshore', geoLonLat: [143.62, 53.02], markerColor: '#0284c7' },
{ id: 'lng-plant', code: 'Завод СПГ', category: 'onshore', geoLonLat: [142.82, 46.72], markerColor: '#ea580c' },
{ id: 'tanker-aniva', code: 'Танкер', category: 'maritime', isMovingShip: true, cruiseKnots: 14, geoLonLat: [143.05, 46.30] }
```

---

## 4. Города, природные памятники и пресеты камеры (`src/data/facilities.js`)

* **`CITIES_DATA`** (10 записей, Сахалин и о-ва Тюлений/Монерон): `{ name, geoLonLat: [lon, lat], isIsland? }`.
* **`FAR_EAST_CITIES_DATA`** (26 записей, ДВ и соседи): `{ name, geoLonLat, isWaterOrIsland?, isRegion?, isTransit?, isNeighbor? }`.
* **`NATURE_LANDMARKS_DATA`** (природные объекты Сахалина): `{ id, name, icon, geoLonLat, yOffset, camOffset: [dx,dy,dz], toast }`.
* **`REGION_PRESETS` / `SAKHALIN1_PRESETS`** (3 района для каждого проекта): `{ label, targetLonLat: [lon, lat], offset: [dx,dy,dz] }`.

**Пример (3 строки `CITIES_DATA`):**
```js
{ name: 'Южно-Сахалинск', geoLonLat: [142.73, 46.96] },
{ name: 'Ноглики', geoLonLat: [143.12, 51.82] },
{ name: 'о. Монерон', geoLonLat: [141.24, 46.25], isIsland: true }
```

---

## 5. Ключи `localStorage` и телеметрия

* `sakhalin2_custom_urls` — JSON-словарь `{ [facilityId]: "https://..." }` пользовательских ссылок.
* `sakhalin_platform_mode` — режим интерфейса (`'auto' | 'mobile' | 'desktop'`).
* Телеметрия мощности (`productionRate`: `0.5`..`1.5`, шаг `5%`): базовые 100% = `11.5 млн т/г` СПГ, `29.0 тыс. т/сут` нефти, `51.0 млн м³/сут` газа.
