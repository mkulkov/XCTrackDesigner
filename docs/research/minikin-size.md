# Размер измерения текста Android

2026-10-10. Профиль 91260, emulator-5554, Android API 35, 1080×2400, 420 dpi, русский язык, DEFAULT_BOLD, без title outline.

Причина части расхождений найдена в [Android 15 MinikinUtils::prepareMinikinPaint](https://android.googlesource.com/platform/frameworks/base/+/android-15.0.0_r1/libs/hwui/hwui/MinikinUtils.cpp): `font.isLinearMetrics() ? font.getSize() : static_cast<int>(font.getSize())`. Измерение использует целый размер, хотя FontMetrics и отрисовка сохраняют дробный. Прежний browser renderer измерял заголовок при дробном размере 27.94488 px. Теперь advances измеряются при 27 px, а глифы рисуются при исходном размере. Это правило применяется и к дробным размерам чисел; целые размеры 390/190 остаются прежними. Метрики ascent/descent не округляются.

Округлённые advances браузера остаются приближением Skia/Minikin; изменение не означает, что Chromium стал Android renderer. Особенно требуют проверки kerning, ligatures, сложные scripts и condensed. Дополнительные x-позиции нужны для разделения размера измерения и рисунка; прежнее правило «заголовок всегда с одним X» заменено проверкой Android layout. Ни строки, ни конкретные слова не сжимаются коэффициентами.

## Native контроль

В XCTrack через UI импортированы только окна synthetic calibration. Размер заголовков изменён с 100% на штатный пункт 140%, затем обратно на 100%. При 100% новый `title100-refreshed.png` побайтно совпал с прежним неизменяемым эталоном: 0 отличий. Это исключило гипотезу устаревшего размера темы после layout. Native Screenshot 140% сохранён отдельно: [calibration-title140-portrait.png](screenshots/calibration-title140-portrait.png), SHA256 `ad899e2eda48461f659d52e7d16acbef750f00920388b143b1b181aaf77d243a`. Оригинальный эталон не заменялся.

Матрица браузерных вариантов сравнивает четыре title regions 540×50, без ресайза, pixelmatch threshold 0.1/includeAA. [100%](title-pipeline-100.json), [140%](title-pipeline-140.json). Вариант native: integer measuring size + округлённые advances. Изменение суммы отличающихся пикселей:

| Размер | Цельная строка при дробном размере | Integer measuring size |
|---|---:|---:|
| 100% | 5987 | 2258 |
| 140% | 3349 | 3049 |

При 140% некоторые отдельные regions ухудшились: vario 1452→1713, AMSL 462→566. Общий результат лучше, но полного совпадения нет. Проверка floor каждого advance при исходном дробном размере дала хороший результат при 100% и резкое ухудшение при 140%; этот вариант отвергнут. CSS text-rendering варианты не улучшили картину. CPU CanvasKit hinting modes, synthetic bold и производная копия без hint instructions также не дали общего нулевого diff. Эти эксперименты приватные, CanvasKit отсутствует в frontend dependencies и bundle.

## Принятое изменение и критерии

[Полный отчёт 100%](integer-title-comparison.json): **10029** отличающихся пикселей вместо 14266. Это не процент точности: большие пустые regions не характеризуют глифы. Speed fill bbox по точному RGB совпадает [199,163,388,448]; vario сохраняет прежнее отклонение до 2 px по вертикали. Коробки заголовков отличаются не более чем на 1 px по каждой стороне, AMSL совпадает. Сглаженные края и маски ещё различаются.

E2E сохраняет diff и JSON до assertions. Добавлены предел регрессии 10100 пикселей и title bbox ≤1 px, без ослабления speed bbox =0. `XCT_QA_REQUIRE_PIXEL_PARITY=1` включает отдельное требование **0** отличающихся пикселей. Этот режим сейчас не проходит; обычные успешные тесты не доказывают pixel parity.

Исследовательский тест запускается явно:

```powershell
$env:XCT_QA_TITLE_PIPELINE='1'
npx playwright test title-pipeline
$env:XCT_QA_TITLE_SIZE='140'
$env:XCT_QA_TITLE_NATIVE='docs/research/screenshots/calibration-title140-portrait.png'
npx playwright test title-pipeline
```

После снимков title size возвращён на 100%, окна восстановлены native импортом backup-04 с выбором «Заменить только окна» и подтверждением «Настройки успешно загружены». Это UI-доказательство; полный export после восстановления в этом проходе не сравнивался. Исходные APK/XCFG сохраняются.

Остаётся получить native hinted glyph advances/позиции и воспроизвести Android rasterization, затем расширить oracle на отрицательные/большие значения, unit-off, orientation и другие классы. Полное соответствие проекта пока не достигнуто; остальные штатные виджеты вне четырёх числовых классов сохраняются, но не имеют точного renderer.

Проверки последнего изменения: `npm run check` прошёл (typecheck, lint, formatting, 26 Vitest, 6 Python, build); обычный E2E — 5 passed, исследовательский тест по умолчанию skipped. Исследовательские проходы 100% и 140% запущены отдельно и прошли. Строгий E2E с `XCT_QA_REQUIRE_PIXEL_PARITY=1` выполнен отдельно и **упал**, Expected 0 / Received 10029. Это известный незакрытый критерий запроса, а не подтверждение полного соответствия. Хеши исходных XCFG и APK повторно совпали с исследовательской provenance.
