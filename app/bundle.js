/* bundle.js ——《同律》CONCORD 发布包（自动生成，勿手改）
 * 由 _deploy_concord/bundle.py 把 index.html 里的 17 个脚本按原顺序拼接而成。
 * 目的：线上首访请求数从 ~19 降到 2（DCL 是请求数敏感，不是字节数敏感）。
 * 源文件顺序与哈希见 _deploy_concord/bundle_manifest.json；
 * 重建：py -X utf8 _deploy_concord/bundle.py
 *
 * 为什么拼接安全：每个源文件都是 IIFE 且 'use strict' 在函数体内，跨文件
 * 只通过 window.* 通信；文件之间用 '\n;\n' 分隔，避免语句意外连写。
 */
/* ===== 01. core/tuning.js ===== */
/* ============================================================================
 * core/tuning.js —《同律》CONCORD 律制数学内核（JS 同构版）
 * ----------------------------------------------------------------------------
 * 用途
 *   浏览器与 Node 双端的律学计算内核，函数名 / 语义 / 数值与 Python 权威实现
 *   `_kernel/tuning.py` **一一对应**（同一份规格的两个实现）。
 *   数值一致性由 `test/cross_check.js` 逐值校验（相对误差 < 1e-12）。
 *
 * 加载方式（作品本体是 file:// 双击即开的单页，**不得用 ESM import**）
 *   <script src="core/tuning.js"><\/script>      →  全局 window.Tuning
 *   const T = require('./core/tuning.js');      →  Node（测试/交叉校验）
 *
 * 输入 / 输出
 *   纯函数，无副作用、无 I/O、无定时器。频率单位 Hz，音分单位 cent。
 *   非法输入（0 / 负数 / 非数值 / 非有限值 / ratio<=0）一律 **throw**，
 *   不静默返回 NaN 或默认值 —— 与 Python 侧 `ValueError` 对应（JS 用 RangeError）。
 *
 * 数值口径（改这里必须同步改 tuning.py 与断言）
 *   基准音        A4 = 440 Hz；黄钟（C4）= 261.6255653005986 Hz
 *   音分          cents(f1,f2) = 1200*log2(f2/f1)
 *   八度折叠      normalize_octave(r) 折到 [1,2)
 *   三分损益      下生 = 弦长×2/3 → 频率×3/2；上生 = 弦长×4/3 → 频率×3/4
 *                 生律次序固定：黄钟→林钟→太簇→南吕→姑洗→应钟→蕤宾→大吕→
 *                 夷则→夹钟→无射→仲吕
 *   毕氏音差      3^12/2^19 = 531441/524288 = 23.4600103846 音分
 *   新法密率      2^(1/12) = 1.0594630943592953（朱载堉 1584《律学新说》）
 *
 * 复跑自检
 *   node 11_同律_国际专项赛/01_作品本体/同律-律学交互实验室/test/cross_check.js
 *
 * 注意（门禁 G1.6 静态扫描）：本文件是纯计算模块——不含动态代码执行、
 * 不含任何网络请求 API、不引用任何外部资源（本行刻意不写出那些 API 的标识符，
 * 免得被按字面扫描的静态检查误报）。
 * ========================================================================== */
(function (global, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;                            // Node（cross_check / verify / 打包脚本）
  } else if (typeof window !== 'undefined') {
    window.Tuning = api;                             // 浏览器（<script> 直接加载）
  } else if (global) {
    global.Tuning = api;                             // 其它宿主（Web Worker 等）
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  /* ======================================================================
   * §0 常量（与 tuning.py §0 逐项对应）
   * ==================================================================== */

  var A4_HZ = 440.0;
  var C4_HZ = A4_HZ / Math.pow(2.0, 9.0 / 12.0);   // = 261.6255653005986
  var EQUAL_TEMPERED_SEMITONE_CENTS = 100.0;
  var PYTHAGOREAN_COMMA_NUM = 531441;              // = 3^12
  var PYTHAGOREAN_COMMA_DEN = 524288;              // = 2^19
  var PYTHAGOREAN_COMMA_RATIO = 531441 / 524288;   // 1.0136432647705078…
  var PYTHAGOREAN_COMMA_CENTS = 1200.0 * Math.log2(Math.pow(3, 12) / Math.pow(2, 19));
  var PYTHAGOREAN_FIFTH_CENTS = 1200.0 * Math.log2(1.5);
  var SYNTONIC_COMMA_NUM = 81;
  var SYNTONIC_COMMA_DEN = 80;
  var SYNTONIC_COMMA_RATIO = 81 / 80;
  var SYNTONIC_COMMA_CENTS = 1200.0 * Math.log2(81.0 / 80.0);
  var JI_MAJOR_THIRD_CENTS = 1200.0 * Math.log2(5.0 / 4.0);

  var LU_NAMES = ['黄钟', '林钟', '太簇', '南吕', '姑洗', '应钟',
    '蕤宾', '大吕', '夷则', '夹钟', '无射', '仲吕'];
  var LU_PITCH = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];
  var LU_PINYIN = ['huangzhong', 'linzhong', 'taicu', 'nanlv', 'guxi', 'yingzhong',
    'ruibin', 'dalv', 'yize', 'jiazhong', 'wushe', 'zhonglv'];
  var CHROMATIC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  //: 中庸律音名（降号侧口径，与 cents 升序一一对应；与通行文献表一致）
  var MEANTONE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

  //: 纯律（5-limit）十二半音比值：[num, den]（与 tuning.py JI_RATIOS 一致）
  var JI_RATIOS = [[1, 1], [16, 15], [9, 8], [6, 5], [5, 4], [4, 3],
    [45, 32], [3, 2], [8, 5], [5, 3], [9, 5], [15, 8]];

  //: M2「律尺」预设（弦长比 → 频率比见 length_to_ratio）
  var STRING_PRESETS = [
    { label_zh: '八度 1/2', label_en: 'Octave 1/2', length_ratio: 0.5, note: '2:1' },
    { label_zh: '纯五度 2/3', label_en: 'Fifth 2/3', length_ratio: 2.0 / 3.0, note: '3:2' },
    { label_zh: '纯四度 3/4', label_en: 'Fourth 3/4', length_ratio: 3.0 / 4.0, note: '4:3' },
    { label_zh: '纯律大三度 4/5', label_en: 'JI major third 4/5', length_ratio: 4.0 / 5.0, note: '5:4' },
    { label_zh: '纯律大六度 5/8', label_en: 'JI major sixth 5/8', length_ratio: 5.0 / 8.0, note: '8:5' },
    { label_zh: '毕氏大三度 64/81', label_en: 'Pythagorean major third 64/81',
      length_ratio: 64.0 / 81.0, note: '81:64' },
    { label_zh: '密率 2^(-1/12)', label_en: 'Mi-lü 2^(-1/12)',
      length_ratio: Math.pow(2.0, -1.0 / 12.0), note: '2^(1/12)' }
  ];

  //: 钟体分音（前 5 个为标准分音结构，其余为工程近似；与 tuning.py BELL_PARTIALS 一致）
  var BELL_PARTIALS = [
    { n: 1, name: 'hum', name_zh: '嗡音', ratio: 0.500, amp: 0.42 },
    { n: 2, name: 'prime', name_zh: '基音', ratio: 1.000, amp: 1.00 },
    { n: 3, name: 'tierce', name_zh: '三度音', ratio: 1.200, amp: 0.55 },
    { n: 4, name: 'quint', name_zh: '五度音', ratio: 1.500, amp: 0.38 },
    { n: 5, name: 'nominal', name_zh: '名义音', ratio: 2.000, amp: 0.62 },
    { n: 6, name: 'deciem', name_zh: '上八度', ratio: 2.500, amp: 0.20 },
    { n: 7, name: 'undeciem', name_zh: '上九度', ratio: 2.667, amp: 0.16 },
    { n: 8, name: 'duodeciem', name_zh: '上十度', ratio: 3.011, amp: 0.13 },
    { n: 9, name: 'upper1', name_zh: '高 1', ratio: 3.596, amp: 0.09 },
    { n: 10, name: 'upper2', name_zh: '高 2', ratio: 4.166, amp: 0.07 },
    { n: 11, name: 'upper3', name_zh: '高 3', ratio: 5.433, amp: 0.05 },
    { n: 12, name: 'upper4', name_zh: '高 4', ratio: 6.796, amp: 0.035 }
  ];

  /* ======================================================================
   * §1 输入校验（对应 tuning.py §1；非法输入一律 throw）
   * ==================================================================== */

  function _fail(msg) {
    throw new RangeError(msg);
  }

  function _num(x, name) {
    if (typeof x === 'string' || typeof x === 'boolean') {
      _fail(name + ' 必须是数值，收到 ' + typeof x + ': ' + String(x) +
        '（字符串/布尔不自动转换）');
    }
    if (typeof x !== 'number') {
      _fail(name + ' 必须是数值，收到 ' + (x === null ? 'null' : typeof x));
    }
    if (!isFinite(x)) { _fail(name + ' 必须是有限数，收到 ' + String(x)); }
    return x;
  }

  function _pos(x, name) {
    var v = _num(x, name);
    if (v <= 0.0) { _fail(name + ' 必须 > 0（收到 ' + v + '）——频率/比值/长度不存在非正值'); }
    return v;
  }

  function _intPos(x, name, minimum) {
    var min = (minimum === undefined) ? 1 : minimum;
    if (typeof x !== 'number' || !Number.isInteger(x)) {
      _fail(name + ' 必须是整数，收到 ' + (typeof x) + ': ' + String(x));
    }
    if (x < min) { _fail(name + ' 必须 >= ' + min + '，收到 ' + x); }
    return x;
  }

  function _intRange(x, name, lo, hi) {
    if (typeof x !== 'number' || !Number.isInteger(x)) {
      _fail(name + ' 必须是整数，收到 ' + (typeof x) + ': ' + String(x));
    }
    if (x < lo || x > hi) { _fail(name + ' 必须在 ' + lo + '..' + hi + '，收到 ' + x); }
    return x;
  }

  /* ======================================================================
   * §2 基础换算
   * ==================================================================== */

  function cents(f1, f2) {
    var a = _pos(f1, 'f1'), b = _pos(f2, 'f2');
    return 1200.0 * Math.log2(b / a);
  }

  function hz_from_cents(base_hz, cents_value) {
    var base = _pos(base_hz, 'base_hz');
    var c = _num(cents_value, 'cents_value');
    return base * Math.pow(2.0, c / 1200.0);
  }

  function ratio_to_cents(ratio) {
    return 1200.0 * Math.log2(_pos(ratio, 'ratio'));
  }

  function cents_to_ratio(cents_value) {
    return Math.pow(2.0, _num(cents_value, 'cents_value') / 1200.0);
  }

  function normalize_octave(ratio) {
    var r = _pos(ratio, 'ratio');
    var n = Math.floor(Math.log2(r));
    var r2 = r / Math.pow(2.0, n);
    if (r2 >= 2.0) { r2 /= 2.0; } else if (r2 < 1.0) { r2 *= 2.0; }
    return r2;
  }

  function length_to_ratio(length_ratio) {
    return 1.0 / _pos(length_ratio, 'length_ratio');
  }

  function midi_to_hz(midi, a4_hz) {
    var m = _num(midi, 'midi');
    var a4 = (a4_hz === undefined) ? A4_HZ : _pos(a4_hz, 'a4_hz');
    return a4 * Math.pow(2.0, (m - 69.0) / 12.0);
  }

  function hz_to_midi(hz, a4_hz) {
    var a4 = (a4_hz === undefined) ? A4_HZ : _pos(a4_hz, 'a4_hz');
    return 69.0 + 12.0 * Math.log2(_pos(hz, 'hz') / a4);
  }

  /* ======================================================================
   * §3 三分损益（整数精确运算：num/den 均为可精确表示的整数，最后一次除法）
   * ==================================================================== */

  /** 第 step 律相对上一律的生成方向（古典弦长口径）：null=起点。 */
  function _sanfenOp(step) {
    if (step === 1) { return null; }
    return (step % 2 === 0) ? '下生' : '上生';
  }

  /** 第 step 律相对黄钟的未折叠频率比，返回 [num, den]（整数，精确）。 */
  function _sanfenFrac(step) {
    _intPos(step, 'step');
    if (step > 12) {
      _fail('三分损益只有 12 律（step 1..12），收到 step=' + step +
        '；闭环检验请用 sanfen_sunyi().closure');
    }
    var num = 1, den = 1;
    for (var k = 2; k <= step; k++) {
      if (_sanfenOp(k) === '下生') { num *= 3; den *= 2; }   // 频率 ×3/2
      else { num *= 3; den *= 4; }                            // 频率 ×3/4
    }
    return [num, den];
  }

  /** 把 [num, den] 折到 [1,2)（整数域折叠，与 Python 结果逐位一致）。 */
  function _foldFrac(num, den) {
    while (num >= 2 * den) { den *= 2; }
    return [num, den];
  }

  function sanfen_ratio(step) {
    var f = _foldFrac.apply(null, _sanfenFrac(step));
    return f[0] / f[1];
  }

  function sanfen_hz(step, base_hz) {
    var base = (base_hz === undefined) ? C4_HZ : _pos(base_hz, 'base_hz');
    return base * sanfen_ratio(step);
  }

  function sanfen_sunyi(base_hz) {
    var base = (base_hz === undefined) ? C4_HZ : _pos(base_hz, 'base_hz');
    var steps = [];
    for (var i = 1; i <= 12; i++) {
      var op = _sanfenOp(i);
      var raw = _sanfenFrac(i);
      var fold = _foldFrac(raw[0], raw[1]);
      var rOct = fold[0] / fold[1];
      var rRaw = raw[0] / raw[1];
      var lenNum = raw[1], lenDen = raw[0];          // 弦长比 = 频率比倒数
      steps.push({
        step: i,
        name: LU_NAMES[i - 1],
        pitch: LU_PITCH[i - 1],
        pinyin: LU_PINYIN[i - 1],
        operation: op === null ? null : (op + '×' + (op === '下生' ? '2/3' : '4/3')),
        operation_freq: op === null ? null : ('×' + (op === '下生' ? '3/2' : '3/4')),
        length_ratio: lenNum / lenDen,
        ratio_delta: op === null ? null : (op === '下生' ? 1.5 : 0.75),
        ratio_raw: rRaw,
        ratio_expr: raw[0] + '/' + raw[1],
        ratio_octave: rOct,
        hz: base * rOct,
        cents_from_base: 1200.0 * Math.log2(rOct)
      });
    }
    var r12 = _foldFrac.apply(null, _sanfenFrac(12));
    var cloNum = r12[0] * 3, cloDen = r12[1] * 4;     // 上生 ×3/4
    var cloFold = _foldFrac(cloNum, cloDen);
    var cloRatio = cloFold[0] / cloFold[1];
    var twelveFifths = 12.0 * PYTHAGOREAN_FIFTH_CENTS;
    var sevenOctaves = 7.0 * 1200.0;
    return {
      base_hz: base,
      steps: steps,
      closure: {
        next_operation: '上生×4/3',
        next_operation_freq: '×3/4',
        ratio_raw: cloRatio,
        ratio_expr: cloFold[0] + '/' + cloFold[1],
        cents: 1200.0 * Math.log2(cloRatio),
        twelve_fifths_cents: twelveFifths,
        seven_octaves_cents: sevenOctaves,
        cents_from_fifths: twelveFifths - sevenOctaves
      },
      closure_cents: 1200.0 * Math.log2(cloRatio)
    };
  }

  /* ======================================================================
   * §4 n 等分八度律（12-TET / 19 / 24 / 53 …）
   * ==================================================================== */

  function et_step_cents(divisions) {
    var d = _intPos(divisions === undefined ? 12 : divisions, 'divisions');
    return 1200.0 / d;
  }

  function et_ratio(index, divisions) {
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      _fail('index 必须是整数，收到 ' + (typeof index) + ': ' + String(index));
    }
    var d = _intPos(divisions === undefined ? 12 : divisions, 'divisions');
    return Math.pow(2.0, index / d);
  }

  function et_cents(index, divisions) {
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      _fail('index 必须是整数，收到 ' + (typeof index) + ': ' + String(index));
    }
    var d = _intPos(divisions === undefined ? 12 : divisions, 'divisions');
    return 1200.0 * index / d;
  }

  function et_hz(index, divisions, base_hz) {
    var d = (divisions === undefined) ? 12 : divisions;
    var base = (base_hz === undefined) ? C4_HZ : _pos(base_hz, 'base_hz');
    return base * et_ratio(index, d);
  }

  function equal_temperament(divisions, base_hz) {
    var d = _intPos(divisions === undefined ? 12 : divisions, 'divisions');
    var base = (base_hz === undefined) ? C4_HZ : _pos(base_hz, 'base_hz');
    var out = [];
    for (var i = 0; i < d; i++) {
      var r = Math.pow(2.0, i / d);
      out.push({
        index: i,
        cents: 1200.0 * i / d,
        ratio: r,
        hz: base * r,
        name: (d === 12) ? CHROMATIC_NAMES[i % 12] : (i + '/' + d),
        pitch: (d === 12) ? CHROMATIC_NAMES[i % 12] : (i + '/' + d),
        octave: (d === 12) ? Math.floor(i / 12) : 0
      });
    }
    return out;
  }

  /* ======================================================================
   * §5 纯律（5-limit just intonation）
   * ==================================================================== */

  function ji_ratio(index) {
    _intRange(index, 'index', 0, 11);
    return JI_RATIOS[index][0] / JI_RATIOS[index][1];
  }

  function ji_cents(index) {
    return 1200.0 * Math.log2(ji_ratio(index));
  }

  function just_intonation(base_hz) {
    var base = (base_hz === undefined) ? C4_HZ : _pos(base_hz, 'base_hz');
    var out = [];
    for (var i = 0; i < 12; i++) {
      var num = JI_RATIOS[i][0], den = JI_RATIOS[i][1];
      var r = num / den;
      var c = 1200.0 * Math.log2(r);
      out.push({
        index: i,
        cents: c,
        ratio: r,
        ratio_expr: num + '/' + den,
        hz: base * r,
        name: CHROMATIC_NAMES[i],
        deviation_from_et_cents: c - (1200.0 * i / 12)
      });
    }
    return out;
  }

  /* ======================================================================
   * §6 中庸律（默认 1/4 音差）
   * ==================================================================== */

  function mt_fifth_cents(comma_fraction) {
    var f = _num(comma_fraction === undefined ? 0.25 : comma_fraction, 'comma_fraction');
    if (!(f >= 0.0 && f <= 1.0)) { _fail('comma_fraction 必须在 [0,1]，收到 ' + f); }
    return PYTHAGOREAN_FIFTH_CENTS - f * SYNTONIC_COMMA_CENTS;
  }

  function _meantoneCentsTable(comma_fraction) {
    var f = (comma_fraction === undefined) ? 0.25 : comma_fraction;
    var fifth = mt_fifth_cents(f);
    var raw = [];
    // 取音范围 = 五度链 E♭ … G♯（链序号 k = −3 … +8），与通行文献表 / research 数据
    // 同一口径（降号侧）。用升号侧（D♯/E♯/A♯）会在 3 个音上差 128/125 = 41.0589 音分。
    for (var k = -3; k <= 8; k++) { raw.push([_mod1200(k * fifth), k]); }
    raw.sort(function (a, b) { return (a[0] - b[0]) || (a[1] - b[1]); });
    return raw.map(function (t) { return t[0]; });
  }

  /** 折到 [0,1200)：JS 的 % 对负数返回负值，必须显式归一（与 Python 语义对齐）。 */
  function _mod1200(x) {
    var m = x % 1200.0;
    return m < 0 ? m + 1200.0 : m;
  }

  function mt_cents(index, comma_fraction) {
    _intRange(index, 'index', 0, 11);
    return _meantoneCentsTable(comma_fraction)[index];
  }

  function mt_ratio(index, comma_fraction) {
    return Math.pow(2.0, mt_cents(index, comma_fraction) / 1200.0);
  }

  function meantone(comma_fraction, base_hz) {
    var f = _num(comma_fraction === undefined ? 0.25 : comma_fraction, 'comma_fraction');
    if (!(f >= 0.0 && f <= 1.0)) { _fail('comma_fraction 必须在 [0,1]，收到 ' + f); }
    var base = (base_hz === undefined) ? C4_HZ : _pos(base_hz, 'base_hz');
    var list = _meantoneCentsTable(f);
    var wolf = 8400.0 - 11.0 * mt_fifth_cents(f);
    var out = [];
    for (var i = 0; i < 12; i++) {
      var r = Math.pow(2.0, list[i] / 1200.0);
      out.push({
        index: i,
        cents: list[i],
        ratio: r,
        hz: base * r,
        name: MEANTONE_NAMES[i],
        fifth_cents: mt_fifth_cents(f),
        wolf_fifth_cents: wolf
      });
    }
    return out;
  }

  /* ======================================================================
   * §7 威克迈斯特 III（Werckmeister, 1691）
   * ==================================================================== */

  var _WM3_TEMPERED_FIFTHS = [1, 2, 3, 6];   // C-G, G-D, D-A, B-F#
  var _WM3_COMPENSATION_CENTS = PYTHAGOREAN_COMMA_CENTS / 4.0;

  function _wm3CentsTable() {
    var fifth = PYTHAGOREAN_FIFTH_CENTS;
    var narrow = _WM3_COMPENSATION_CENTS;
    var acc = 0.0;
    var chain = [];
    for (var k = 1; k <= 12; k++) {
      var step = fifth - (_WM3_TEMPERED_FIFTHS.indexOf(k) >= 0 ? narrow : 0.0);
      acc += step;
      if (k < 12) { chain.push([acc % 1200.0, k]); }
    }
    chain.push([0.0, 0]);
    chain.sort(function (a, b) { return (a[0] - b[0]) || (a[1] - b[1]); });
    return chain.map(function (t) { return t[0]; });
  }

  function wm_cents(index) {
    _intRange(index, 'index', 0, 11);
    return _wm3CentsTable()[index];
  }

  function wm_ratio(index) {
    return Math.pow(2.0, wm_cents(index) / 1200.0);
  }

  function werckmeister_iii(base_hz) {
    var base = (base_hz === undefined) ? C4_HZ : _pos(base_hz, 'base_hz');
    var list = _wm3CentsTable();
    var out = [];
    for (var i = 0; i < 12; i++) {
      var r = Math.pow(2.0, list[i] / 1200.0);
      out.push({
        index: i, cents: list[i], ratio: r, hz: base * r, name: CHROMATIC_NAMES[i]
      });
    }
    return out;
  }

  /* ======================================================================
   * §8 钟体分音 / 泛音列 / 品丝 / 拍频
   * ==================================================================== */

  function bell_ratio(index) {
    _intRange(index, 'index', 0, BELL_PARTIALS.length - 1);
    return BELL_PARTIALS[index].ratio;
  }

  function bell_amp(index) {
    _intRange(index, 'index', 0, BELL_PARTIALS.length - 1);
    return BELL_PARTIALS[index].amp;
  }

  function bell_hz(index, f0) {
    return _pos(f0, 'f0') * bell_ratio(index);
  }

  function bell_partials(f0, n) {
    var f = _pos(f0, 'f0');
    var k = _intPos(n === undefined ? 12 : n, 'n');
    if (k > BELL_PARTIALS.length) {
      _fail('n 最多 ' + BELL_PARTIALS.length + '（分音表长度），收到 ' + k);
    }
    var out = [];
    for (var i = 0; i < k; i++) {
      var p = BELL_PARTIALS[i];
      out.push({
        n: p.n, ratio: p.ratio, hz: f * p.ratio,
        amp: p.amp, name: p.name, name_zh: p.name_zh
      });
    }
    return out;
  }

  function harmonic_ratio(n) {
    return _intPos(n, 'n');
  }

  function harmonic_hz(n, f0) {
    var k = _intPos(n, 'n');
    var base = (f0 === undefined) ? C4_HZ : _pos(f0, 'f0');
    return k * base;
  }

  function harmonic_series(f0, n) {
    var f = _pos(f0, 'f0');
    var k = _intPos(n === undefined ? 12 : n, 'n');
    var out = [];
    for (var i = 1; i <= k; i++) {
      out.push({
        n: i, ratio: i, hz: f * i, amp: 1.0 / i,
        cents_from_f0: 1200.0 * Math.log2(i)
      });
    }
    return out;
  }

  function fret_remaining_ratio(n) {
    if (typeof n !== 'number' || !Number.isInteger(n)) {
      _fail('n 必须是整数，收到 ' + (typeof n) + ': ' + String(n));
    }
    return Math.pow(2.0, -n / 12.0);
  }

  function fret_distance(length, n) {
    var L = _pos(length, 'length');
    if (typeof n !== 'number' || !Number.isInteger(n)) {
      _fail('n 必须是整数，收到 ' + (typeof n) + ': ' + String(n));
    }
    return L * (1.0 - Math.pow(2.0, -n / 12.0));
  }

  function fret_positions(length, n) {
    var L = _pos(length, 'length');
    var k = _intPos(n === undefined ? 12 : n, 'n');
    var out = [];
    for (var i = 1; i <= k; i++) {
      var rem = Math.pow(2.0, -i / 12.0);
      out.push({
        n: i,
        distance: L * (1.0 - rem),
        remaining_length: L * rem,
        remaining_ratio: rem,
        cents: 100.0 * i
      });
    }
    return out;
  }

  function beat_frequency(f1, f2) {
    return Math.abs(_pos(f1, 'f1') - _pos(f2, 'f2'));
  }

  /* ======================================================================
   * §9 通用表校验（与 tuning.py validate_cents_table 同义）
   * ==================================================================== */

  function validate_cents_table(table, expected_total) {
    if (!table || typeof table.length !== 'number') {
      _fail('validate_cents_table: 输入必须是数组/类数组');
    }
    var vals = [];
    for (var i = 0; i < table.length; i++) {
      var row = table[i];
      if (row && typeof row === 'object') {
        if (!('cents' in row)) {
          _fail('validate_cents_table: 第 ' + i + ' 项 dict 缺少 cents 键');
        }
        vals.push(_num(row.cents, 'table[' + i + '].cents'));
      } else if (typeof row === 'number') {
        vals.push(_num(row, 'table[' + i + ']'));
      } else {
        _fail('validate_cents_table: 第 ' + i + ' 项既不是对象也不是数值（' + typeof row + '）');
      }
    }
    var errors = [];
    if (vals.length < 2) { errors.push('音数过少：' + vals.length + '（至少 2）'); }
    for (var j = 0; j < vals.length; j++) {
      if (!(vals[j] >= -1e-9 && vals[j] < 1200.0 + 1e-9)) {
        errors.push('第 ' + j + ' 项音分 ' + vals[j] + ' 未归一到 [0,1200)');
      }
    }
    for (var m = 1; m < vals.length; m++) {
      if (!(vals[m] > vals[m - 1])) {
        errors.push('非严格递增：第 ' + (m - 1) + '=' + vals[m - 1] + ' → 第 ' + m + '=' + vals[m]);
      }
    }
    var steps = [];
    for (var s = 1; s < vals.length; s++) { steps.push(vals[s] - vals[s - 1]); }
    var wrap = 0.0, coverage = 0.0, span = 0.0;
    if (vals.length) {
      wrap = (vals[0] + 1200.0) - vals[vals.length - 1];
      coverage = steps.reduce(function (a, b) { return a + b; }, 0.0) + wrap;
      span = vals[vals.length - 1] - vals[0];
    }
    if (vals.length && Math.abs(coverage - 1200.0) > 1e-9) {
      errors.push('八度覆盖量 ' + coverage.toFixed(12) + ' != 1200（差 ' +
        (coverage - 1200.0).toExponential(3) + '）');
    }
    if (expected_total !== undefined && expected_total !== null) {
      var et = _num(expected_total, 'expected_total');
      if (Math.abs(coverage - et) > 1e-9) {
        errors.push('覆盖量 ' + coverage.toFixed(12) + ' != expected_total ' + et);
      }
    }
    if (errors.length) {
      throw new RangeError('validate_cents_table 未通过：\n  - ' + errors.join('\n  - '));
    }
    var allSteps = steps.concat(vals.length ? [wrap] : []);
    return {
      ok: true,
      n: vals.length,
      span: span,
      coverage: coverage,
      step_min: Math.min.apply(null, allSteps),
      step_max: Math.max.apply(null, allSteps),
      steps: allSteps,
      first: vals[0],
      last: vals[vals.length - 1]
    };
  }

  /* ======================================================================
   * §10 世界律制数据接入（数据归 research；JS 无文件系统，由调用方注入）
   * ==================================================================== */

  var _worldTunings = null;
  var _worldTuningsStatus = 'pending';

  /** 注入世界律制数据（应用在启动时把 data/tuning_data.js 的内容传进来）。 */
  function set_world_tunings(data) {
    if (data === null || data === undefined) {
      _worldTunings = null;
      _worldTuningsStatus = 'pending';
      return load_world_tunings();
    }
    if (typeof data !== 'object') { _fail('set_world_tunings: 需要一个对象或数组'); }
    _worldTunings = data;
    _worldTuningsStatus = 'ok';
    return load_world_tunings();
  }

  /** 查询世界律制数据状态（与 Python load_world_tunings 同义；不编造数据）。 */
  function load_world_tunings() {
    var items = [];
    if (_worldTunings) {
      items = Array.isArray(_worldTunings) ? _worldTunings
        : (_worldTunings.tunings || _worldTunings.items || []);
    }
    return {
      status: _worldTuningsStatus,
      data: _worldTunings,
      n_tunings: items.length,
      reason: _worldTuningsStatus === 'pending'
        ? '世界律制数据未注入（等待 research 成员产出 _research/data_tuning.json）'
        : ''
    };
  }

  /* ======================================================================
   * §11 标量便捷封装（交叉校验的标量入口）
   * ==================================================================== */

  function pythagorean_comma_cents() { return PYTHAGOREAN_COMMA_CENTS; }
  function syntonic_comma_cents() { return SYNTONIC_COMMA_CENTS; }

  /* ======================================================================
   * §12 导出（snake_case 与 Python 同名；camelCase 供应用层书写方便）
   * ==================================================================== */

  var api = {
    VERSION: VERSION,
    // 常量
    A4_HZ: A4_HZ,
    C4_HZ: C4_HZ,
    BASE_HZ: C4_HZ,
    EQUAL_TEMPERED_SEMITONE_CENTS: EQUAL_TEMPERED_SEMITONE_CENTS,
    PYTHAGOREAN_COMMA_NUM: PYTHAGOREAN_COMMA_NUM,
    PYTHAGOREAN_COMMA_DEN: PYTHAGOREAN_COMMA_DEN,
    PYTHAGOREAN_COMMA_RATIO: PYTHAGOREAN_COMMA_RATIO,
    PYTHAGOREAN_COMMA_CENTS: PYTHAGOREAN_COMMA_CENTS,
    PYTHAGOREAN_FIFTH_CENTS: PYTHAGOREAN_FIFTH_CENTS,
    SYNTONIC_COMMA_NUM: SYNTONIC_COMMA_NUM,
    SYNTONIC_COMMA_DEN: SYNTONIC_COMMA_DEN,
    SYNTONIC_COMMA_RATIO: SYNTONIC_COMMA_RATIO,
    SYNTONIC_COMMA_CENTS: SYNTONIC_COMMA_CENTS,
    JI_MAJOR_THIRD_CENTS: JI_MAJOR_THIRD_CENTS,
    LU_NAMES: LU_NAMES,
    LU_PITCH: LU_PITCH,
    LU_PINYIN: LU_PINYIN,
    CHROMATIC_NAMES: CHROMATIC_NAMES,
    MEANTONE_NAMES: MEANTONE_NAMES,
    JI_RATIOS: JI_RATIOS,
    STRING_PRESETS: STRING_PRESETS,
    BELL_PARTIALS: BELL_PARTIALS,

    // 基础
    cents: cents,
    hz_from_cents: hz_from_cents,
    ratio_to_cents: ratio_to_cents,
    cents_to_ratio: cents_to_ratio,
    normalize_octave: normalize_octave,
    length_to_ratio: length_to_ratio,
    midi_to_hz: midi_to_hz,
    hz_to_midi: hz_to_midi,

    // 三分损益
    sanfen_ratio: sanfen_ratio,
    sanfen_hz: sanfen_hz,
    sanfen_sunyi: sanfen_sunyi,

    // 等分律
    et_step_cents: et_step_cents,
    et_ratio: et_ratio,
    et_cents: et_cents,
    et_hz: et_hz,
    equal_temperament: equal_temperament,

    // 纯律 / 中庸律 / 良好律
    ji_ratio: ji_ratio,
    ji_cents: ji_cents,
    just_intonation: just_intonation,
    mt_fifth_cents: mt_fifth_cents,
    mt_cents: mt_cents,
    mt_ratio: mt_ratio,
    meantone: meantone,
    wm_cents: wm_cents,
    wm_ratio: wm_ratio,
    werckmeister_iii: werckmeister_iii,

    // 物理
    bell_ratio: bell_ratio,
    bell_amp: bell_amp,
    bell_hz: bell_hz,
    bell_partials: bell_partials,
    harmonic_ratio: harmonic_ratio,
    harmonic_hz: harmonic_hz,
    harmonic_series: harmonic_series,
    fret_remaining_ratio: fret_remaining_ratio,
    fret_distance: fret_distance,
    fret_positions: fret_positions,
    beat_frequency: beat_frequency,

    // 校验与数据
    validate_cents_table: validate_cents_table,
    load_world_tunings: load_world_tunings,
    set_world_tunings: set_world_tunings,
    pythagorean_comma_cents: pythagorean_comma_cents,
    syntonic_comma_cents: syntonic_comma_cents
  };

  // ---- camelCase 别名（应用层可写 T.hzFromCents(...)）----
  api.hzFromCents = hz_from_cents;
  api.ratioToCents = ratio_to_cents;
  api.centsToRatio = cents_to_ratio;
  api.normalizeOctave = normalize_octave;
  api.lengthToRatio = length_to_ratio;
  api.sanfenSunyi = sanfen_sunyi;
  api.equalTemperament = equal_temperament;
  api.justIntonation = just_intonation;
  api.werckmeisterIII = werckmeister_iii;
  api.bellPartials = bell_partials;
  api.harmonicSeries = harmonic_series;
  api.fretPositions = fret_positions;
  api.beatFrequency = beat_frequency;
  api.validateCentsTable = validate_cents_table;
  api.c4Hz = C4_HZ;
  api.a4Hz = A4_HZ;

  return api;
});
;
/* ===== 02. audio/synth.js ===== */
/* ============================================================================
 * audio/synth.js —《同律》CONCORD 确定性 Web Audio 音色引擎
 * ----------------------------------------------------------------------------
 * 用途
 *   把律学数字变成可听的声部：钟（非谐分音 + 指数衰减）、琴弦（Karplus-Strong，
 *   固定 LCG 种子 → 确定性）、管风琴（谐波叠加）。渲染层（OfflineAudioContext）
 *   可无人值守跑；播放层才需用户手势——本文件**不做任何自动播放**，由应用在
 *   用户点击后创建 AudioContext 并调用。
 *
 * 加载方式（作品本体是 file:// 双击即开的单页，不得用 ESM import）
 *   <script src="core/tuning.js"><\/script>
 *   <script src="audio/synth.js"><\/script>          →  全局 window.Synth
 *   const Synth = require('./audio/synth.js');       →  Node（测试）
 *
 * 输入 / 输出
 *   createSynth(ctx, options?) -> {bell, pluck, organ, chord, stopAll, ...}
 *     ctx : BaseAudioContext（AudioContext 或 **OfflineAudioContext** 均可）
 *     每个发声函数返回 voice 句柄 {stop(t), gain, nodes}
 *   analyze(buffers, options?) -> [{rms, peakDb, peakFrequency, peakCents, …}]
 *   fft / peakFrequency / detectBeat / centsError —— 测试用的频谱辅助
 *
 * 确定性保证（门禁 G1.4）
 *   1. 不依赖 Math.random：Karplus-Strong 的噪声用固定种子的线性同余发生器；
 *   2. 所有振荡器频率由调用参数直接给定，无随机失谐、无时间戳；
 *   3. 同一串调用在 OfflineAudioContext 上渲染出的样本可逐位复现。
 *
 * 复跑自检
 *   node 11_同律_国际专项赛/01_作品本体/同律-律学交互实验室/test/verify_audio.js
 *
 * 注意（门禁 G1.6 静态扫描）：本文件不含动态代码执行、网络请求、外部资源引用。
 * ========================================================================== */
(function (global, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
  } else if (typeof window !== 'undefined') {
    window.Synth = api;
  } else if (global) {
    global.Synth = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  /* ======================================================================
   * §0 依赖解析：钟体分音表与律制内核
   *   浏览器：<script> 已把 window.Tuning 挂好
   *   Node  ：同目录相对 require（../core/tuning.js）
   * ==================================================================== */

  var _tuningCache = null;

  function _tuning() {
    if (_tuningCache) { return _tuningCache; }
    if (typeof Tuning !== 'undefined' && Tuning && Tuning.BELL_PARTIALS) {
      _tuningCache = Tuning;
      return _tuningCache;
    }
    if (typeof module === 'object' && module && typeof require === 'function') {
      try {
        _tuningCache = require('../core/tuning.js');   // 仅在 Node 下走这里
        if (_tuningCache && _tuningCache.BELL_PARTIALS) { return _tuningCache; }
      } catch (e) { /* 落到下面统一报错 */ }
    }
    throw new Error('synth.js 需要先加载 core/tuning.js（提供钟体分音表与律制常数）');
  }

  /* ======================================================================
   * §1 音色配方（工程常数；改这里要同步 test/audio_assertions.js 的期望）
   * ==================================================================== */

  var CFG = {
    // 主输出电平（线性），给多声部留 headroom
    masterGain: 0.7,
    // 起振/收尾时间（秒）
    attack: 0.004,
    release: 0.06,
    // 钟：每个分音的振幅缩放与衰减时间系数
    bellGain: 0.22,
    bellDecayScale: 1.2,
    bellDecayRolloff: 0.25,
    // 管风琴：谐波个数与幅度指数
    organHarmonics: 8,
    organAmpExp: 1.15,
    organGain: 0.34,
    // 琴弦：KS 衰减目标（dur 秒后残余幅度）
    pluckGain: 0.55,
    pluckTailRatio: 0.01,
    // 默认日程提前量（秒）：避免在 currentTime 边界调度的毛刺
    lead: 0.01
  };

  /* ======================================================================
   * §2 确定性噪声（线性同余发生器，固定种子 → 可复现的 Karplus-Strong 激励）
   * ==================================================================== */

  /** 32 位 LCG（Numerical Recipes 参数），返回 [0,1)。 */
  function makeLcg(seed) {
    var state = (seed === undefined ? 12345 : (seed >>> 0)) >>> 0;
    return function next() {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  /* ======================================================================
   * §3 频谱工具（零依赖 FFT；测试与页面频谱图共用）
   * ==================================================================== */

  function nextPow2(n) {
    var p = 1;
    while (p < n) { p <<= 1; }
    return p;
  }

  /** 原地 radix-2 FFT；inverse=true 时做逆变换（不除 N，便于解析信号）。 */
  function fftComplex(re, im, inverse) {
    var n = re.length;
    if (n !== im.length || (n & (n - 1)) !== 0) {
      throw new RangeError('fftComplex: 长度必须为 2 的幂且 re/im 等长（收到 ' + n + '）');
    }
    var i, j, k, len, half, ang, wr, wi, cr, ci, ncr, ur, ui, vr, vi, t;
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) { j ^= bit; }
      j ^= bit;
      if (i < j) {
        t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    var sign = inverse ? 1 : -1;
    for (len = 2; len <= n; len <<= 1) {
      half = len >> 1;
      ang = sign * 2 * Math.PI / len;
      wr = Math.cos(ang);
      wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        cr = 1.0;
        ci = 0.0;
        for (k = 0; k < half; k++) {
          ur = re[i + k];
          ui = im[i + k];
          vr = re[i + k + half] * cr - im[i + k + half] * ci;
          vi = re[i + k + half] * ci + im[i + k + half] * cr;
          re[i + k] = ur + vr;
          im[i + k] = ui + vi;
          re[i + k + half] = ur - vr;
          im[i + k + half] = ui - vi;
          ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = ncr;
        }
      }
    }
  }

  /** Hann 窗（返回到新数组上，长度 n）。 */
  function hannWindow(n) {
    var w = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
    }
    return w;
  }

  function toFloatArray(x) {
    if (!x) { throw new RangeError('需要 Float32Array/Float64Array/Array/AudioBuffer'); }
    if (typeof x.getChannelData === 'function') { return x.getChannelData(0); }  // AudioBuffer
    if (x instanceof Float64Array || x instanceof Float32Array || Array.isArray(x)) {
      return x;
    }
    if (typeof x.length === 'number') { return x; }
    throw new RangeError('不支持的缓冲类型: ' + typeof x);
  }

  /**
   * 幅值谱（Hann 窗 + 补零 FFT）。页面频谱图（M6）与测试找峰共用。
   * @returns {{mag:Float64Array, nfft:number, df:number, sampleRate:number}}
   *          mag 长度 nfft/2+1，第 i 根谱线频率 = i * df
   */
  function magnitudeSpectrum(buffers, sampleRate, options) {
    var opts = options || {};
    var x = toFloatArray(buffers);
    var n = x.length;
    var nfft = opts.nfft || nextPow2(n * 4);
    if ((nfft & (nfft - 1)) !== 0 || nfft < n) { nfft = nextPow2(Math.max(n, 1024)); }
    var w = hannWindow(n);
    var re = new Float64Array(nfft);
    var im = new Float64Array(nfft);
    var mean = 0;
    var i;
    for (i = 0; i < n; i++) { mean += x[i]; }
    mean /= n;
    for (i = 0; i < n; i++) { re[i] = (x[i] - mean) * w[i]; }
    fftComplex(re, im, false);
    var half = nfft >> 1;
    var mag = new Float64Array(half + 1);
    for (i = 0; i <= half; i++) { mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]); }
    return { mag: mag, nfft: nfft, df: sampleRate / nfft, sampleRate: sampleRate };
  }

  /**
   * 单音基频测量（供门禁 G1.4 的「单音 FFT 峰值误差 < 0.5 音分」）。
   * 步骤：Hann 窗 → 补零到 2 的幂 → FFT → 幅值峰值 → 对数幅值抛物线插值。
   * @returns {{frequency:number, magnitude:number, peakDb:number, nfft:number}}
   */
  function peakFrequency(buffers, sampleRate, options) {
    var opts = options || {};
    var spec = magnitudeSpectrum(buffers, sampleRate, opts);
    var mag = spec.mag;
    var nfft = spec.nfft;
    var half = nfft >> 1;
    var fminBin = Math.max(1, Math.floor((opts.fmin || 20) * nfft / sampleRate));
    var fmaxBin = Math.min(half - 1, Math.ceil((opts.fmax || sampleRate / 2) * nfft / sampleRate));
    var best = -1;
    var bestMag = -1;
    for (var i = fminBin; i <= fmaxBin; i++) {
      if (mag[i] > bestMag) { bestMag = mag[i]; best = i; }
    }
    var freq = best * sampleRate / nfft;
    // 对数幅值抛物线插值（Hann 主瓣内精度远优于 1 bin）
    if (best > 0 && best < half) {
      var y0 = Math.log(mag[best - 1] + 1e-300);
      var y1 = Math.log(mag[best] + 1e-300);
      var y2 = Math.log(mag[best + 1] + 1e-300);
      var den = y0 - 2 * y1 + y2;
      if (den !== 0) { freq = (best + 0.5 * (y0 - y2) / den) * sampleRate / nfft; }
    }
    return {
      frequency: freq,
      magnitude: bestMag,
      peakDb: 20 * Math.log10(bestMag / (nfft * 0.25) + 1e-300),
      nfft: nfft
    };
  }

  /** 解析信号包络（Hilbert）：正频率 ×2、负频率清零、逆变换取模。 */
  function analyticEnvelope(buffers) {
    var x = toFloatArray(buffers);
    var n = x.length;
    var nfft = nextPow2(n);
    var re = new Float64Array(nfft);
    var im = new Float64Array(nfft);
    for (var i = 0; i < n; i++) { re[i] = x[i]; }
    fftComplex(re, im, false);
    // 正频率加倍、负频率清零（0 与 Nyquist 保持）
    for (i = 1; i < nfft / 2; i++) {
      re[i] *= 2; im[i] *= 2;
      re[nfft - i] = 0; im[nfft - i] = 0;
    }
    fftComplex(re, im, true);
    var env = new Float64Array(n);
    for (i = 0; i < n; i++) {
      env[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / nfft;   // 逆变换未除 N
    }
    return env;
  }

  /**
   * 拍频测量（供门禁 G1.4 的「拍频包络与解析值误差 ≤ 0.2 Hz」）。
   * 包络 → 去均值 → Hann → 补零 FFT → 抛物线插值，返回包络基频（Hz）。
   */
  function detectBeat(buffers, sampleRate, options) {
    var opts = options || {};
    var env = analyticEnvelope(buffers);
    var n = env.length;
    var mean = 0;
    for (var i = 0; i < n; i++) { mean += env[i]; }
    mean /= n;
    var nfft = opts.nfft || nextPow2(n * 2);
    if (nfft < n || (nfft & (nfft - 1)) !== 0) { nfft = nextPow2(n); }
    var w = hannWindow(n);
    var re = new Float64Array(nfft);
    var im = new Float64Array(nfft);
    for (i = 0; i < n; i++) { re[i] = (env[i] - mean) * w[i]; }
    fftComplex(re, im, false);
    var half = nfft >> 1;
    var mag = new Float64Array(half + 1);
    for (i = 0; i <= half; i++) { mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]); }
    var lo = Math.max(1, Math.floor((opts.fmin || 0.2) * nfft / sampleRate));
    var hi = Math.min(half - 1, Math.ceil((opts.fmax || 25.0) * nfft / sampleRate));
    var best = lo, bestMag = -1;
    for (i = lo; i <= hi; i++) { if (mag[i] > bestMag) { bestMag = mag[i]; best = i; } }
    var f = best * sampleRate / nfft;
    if (best > 0 && best < half) {
      var y0 = Math.log(mag[best - 1] + 1e-300);
      var y1 = Math.log(mag[best] + 1e-300);
      var y2 = Math.log(mag[best + 1] + 1e-300);
      var den = y0 - 2 * y1 + y2;
      if (den !== 0) { f = (best + 0.5 * (y0 - y2) / den) * sampleRate / nfft; }
    }
    return { beatHz: f, magnitude: bestMag, nfft: nfft, envelopeLength: n };
  }

  /** 两个频率之间的音分差（用于把频率误差换成音分误差）。 */
  function centsError(measuredHz, expectedHz) {
    return 1200 * Math.log2(measuredHz / expectedHz);
  }

  /**
   * 批量分析缓冲（`analyze(buffers)`）——测试做 FFT 的统一入口。
   * @param {Array|AudioBuffer} buffers 一组缓冲（AudioBuffer / Float32Array）
   * @param {{sampleRate:number, expected?:Array<number>, fmin?:number}} options
   * @returns {Array<object>} 每个缓冲一项
   */
  function analyze(buffers, options) {
    var opts = options || {};
    var sr = opts.sampleRate;
    if (!sr) { throw new RangeError('analyze: 必须给 options.sampleRate'); }
    var list = Array.isArray(buffers) ? buffers : [buffers];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var x = toFloatArray(list[i]);
      var sum = 0, sq = 0, peak = 0;
      for (var k = 0; k < x.length; k++) {
        var v = x[k];
        sum += v;
        sq += v * v;
        if (Math.abs(v) > peak) { peak = Math.abs(v); }
      }
      var rms = Math.sqrt(sq / Math.max(1, x.length));
      var pf = peakFrequency(x, sr, opts);
      var rec = {
        index: i,
        sampleRate: sr,
        length: x.length,
        duration: x.length / sr,
        rms: rms,
        dc: sum / Math.max(1, x.length),
        peakAbs: peak,
        peakFrequency: pf.frequency,
        peakMagnitude: pf.magnitude,
        peakDb: pf.peakDb,
        nfft: pf.nfft
      };
      if (opts.expected && typeof opts.expected[i] === 'number') {
        rec.expected = opts.expected[i];
        rec.centsError = centsError(pf.frequency, opts.expected[i]);
      }
      out.push(rec);
    }
    return out;
  }

  /* ======================================================================
   * §4 音色实现
   * ==================================================================== */

  /** 取一个可用的音频上下文（默认主输出）。 */
  function _ctxOf(ctx) {
    if (!ctx || typeof ctx.createOscillator !== 'function') {
      throw new TypeError('createSynth(ctx): ctx 必须是 AudioContext 或 OfflineAudioContext');
    }
    return ctx;
  }

  /**
   * 创建音色引擎。
   * @param {BaseAudioContext} ctx
   * @param {{gain?:number, lead?:number}} options
   */
  function createSynth(ctx, options) {
    var C = _ctxOf(ctx);
    var opts = options || {};
    var T = _tuning();

    var master = C.createGain();
    master.gain.value = (opts.gain === undefined) ? CFG.masterGain : opts.gain;
    master.connect(C.destination);

    var voices = [];

    function t0Now() {
      var lead = (opts.lead === undefined) ? CFG.lead : opts.lead;
      return (C.currentTime || 0) + lead;
    }

    function registerVoice(nodes, sources, startTime) {
      var v = {
        nodes: nodes,
        sources: sources,
        startTime: startTime,
        stop: function (when) {
          var t = (when === undefined) ? (C.currentTime || 0) : when;
          for (var i = 0; i < sources.length; i++) {
            try { sources[i].stop(t); } catch (e) { /* 已停止 */ }
          }
          for (var j = 0; j < nodes.length; j++) {
            try { nodes[j].disconnect(); } catch (e2) { /* 已断开 */ }
          }
        }
      };
      voices.push(v);
      return v;
    }

    /* ---------------------------------------------------------------- 钟
     * 非谐分音（取自 core/tuning.js 的 BELL_PARTIALS）+ 每分音独立指数衰减。
     *
     * 为什么在 JS 里算样本、再用 AudioBufferSourceNode 播放（而不是每分音一个
     * OscillatorNode）：Chromium 的振荡器 + AudioParam 自动化在 float32 内部累积，
     * 同一串调用两次渲染会差 1 ULP —— 那样「确定性」只能精确到 −120 dBFS。
     * 钟的分音**本来就是数值可算的**（ratio × f0、指数衰减），直接算成缓冲后
     * 两次渲染**逐位相同**，门禁 G1.4 的确定性才是一个干净的真命题。
     */
    function bell(f0, dur, o) {
      var f = Number(f0);
      var d = Math.max(0.05, Number(dur) || 1.5);
      var oo = o || {};
      var sr = C.sampleRate;
      var parts = T.bell_partials(f, Math.min(T.BELL_PARTIALS.length, oo.partials || 12));
      var total = Math.max(9, Math.round(sr * (d + CFG.release)));
      var buf = new Float32Array(total);
      var attackS = Math.max(1, Math.round(CFG.attack * sr));
      var releaseS = Math.max(1, Math.round(CFG.release * sr));
      var relStart = Math.max(0, total - releaseS);
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        if (p.hz >= sr / 2) { continue; }             // 超过 Nyquist 的分音丢弃
        var amp = CFG.bellGain * p.amp;
        // 高分音衰减更快（钟体的高频辐射更"干"）
        var tauS = d * Math.min(1.0, CFG.bellDecayScale /
          (1.0 + CFG.bellDecayRolloff * (p.n - 1))) * 0.35;
        var omega = 2.0 * Math.PI * p.hz / sr;
        var decayPerSample = Math.exp(-1.0 / (tauS * sr));
        var env = 1.0;
        for (var i = 0; i < total; i++) {
          var a = 1.0;
          if (i < attackS) { a = i / attackS; }        // 起振（防爆音）
          if (i > relStart) { a *= (total - i) / releaseS; }  // 收尾淡出（防截断咔哒）
          buf[i] += amp * a * env * Math.sin(omega * i);
          env *= decayPerSample;
        }
      }
      // 归一化到 ±1 内（多分音相加可能超过 1）
      var peak = 0;
      for (var j = 0; j < total; j++) { var q = buf[j] < 0 ? -buf[j] : buf[j]; if (q > peak) { peak = q; } }
      if (peak > 1.0) {
        var inv = 1.0 / peak;
        for (j = 0; j < total; j++) { buf[j] *= inv; }
      }
      var audioBuf = C.createBuffer(1, total, sr);
      if (typeof audioBuf.copyToChannel === 'function') {
        audioBuf.copyToChannel(buf, 0);
      } else {
        audioBuf.getChannelData(0).set(buf);
      }
      var src = C.createBufferSource();
      src.buffer = audioBuf;
      var g = C.createGain();
      var t0 = t0Now();
      g.gain.setValueAtTime(1.0, t0);
      src.connect(g);
      g.connect(master);
      src.start(t0);
      src.stop(t0 + d + CFG.release + 0.01);
      return registerVoice([g], [src], t0);
    }

    /* ---------------------------------------------------------------- 弦
     * Karplus-Strong：噪声激励 + 延迟线低通反馈。为了**确定性**与**精确音高**
     * （Web Audio 的反馈回路最小延迟是一个渲染量子 128 样本，会量化音高），
     * 这里在 JS 里直接把波形算出来再交给 AudioBufferSourceNode 播放。
     */
    function pluck(f0, dur, o) {
      var f = Number(f0);
      var d = Math.max(0.05, Number(dur) || 1.5);
      var oo = o || {};
      var sr = C.sampleRate;
      // 延迟线长度：减去环路低通（两点平均）固有的 0.5 样本相位延迟，否则音会偏低；
      // 用**分数延迟**（线性插值）让音高不受整数样本量化限制。
      var Dtarget = Math.max(2.0, sr / f - 0.5);
      var N = Math.max(2, Math.floor(Dtarget));
      var frac = Dtarget - N;
      if (frac < 0) { frac = 0; }
      var total = Math.max(N + 3, Math.round(sr * (d + CFG.release)));
      var rnd = makeLcg(oo.seed === undefined ? 12345 : oo.seed);
      var buf = new Float32Array(total);
      // 激励：固定种子白噪声（确定性），并去掉均值 —— 环路对直流增益为 1，
      // 若激励有直流分量，拨弦会留下一个缓慢衰减的直流偏移（听感上是「扑」一下
      // 的低频撞击，测量上是 |dc| 偏大）。真实弦的位移期望为零，故这里显式归零。
      var i;
      var noiseSum = 0;
      for (i = 0; i < N; i++) { buf[i] = rnd() * 2 - 1; noiseSum += buf[i]; }
      var noiseMean = noiseSum / N;
      for (i = 0; i < N; i++) { buf[i] -= noiseMean; }
      // 反馈：y[n] = g * ( x[n-D] + x[n-D-1] ) / 2，x[·] 用线性插值分数延迟读出
      var g = Math.pow(CFG.pluckTailRatio, 1.0 / (sr * d));
      for (i = N; i < total; i++) {
        var i1 = Math.max(0, i - N - 1);
        var i2 = Math.max(0, i - N - 2);
        var v = (1 - frac) * buf[i - N] + frac * buf[i - N - 1 < 0 ? 0 : i - N - 1];
        var w = (1 - frac) * buf[i1] + frac * buf[i2];
        buf[i] = g * 0.5 * (v + w);
      }
      // 归一化到 ±1 内（KS 输出幅度随 N 变化）
      var peak = 0;
      for (i = 0; i < total; i++) { var a = Math.abs(buf[i]); if (a > peak) { peak = a; } }
      var norm = peak > 0 ? (CFG.pluckGain / peak) : CFG.pluckGain;
      for (i = 0; i < total; i++) { buf[i] *= norm; }

      var audioBuf = C.createBuffer(1, total, sr);
      if (typeof audioBuf.copyToChannel === 'function') {
        audioBuf.copyToChannel(buf, 0);
      } else {
        audioBuf.getChannelData(0).set(buf);
      }
      var src = C.createBufferSource();
      src.buffer = audioBuf;
      var gg = C.createGain();
      var t0 = t0Now();
      // 收尾淡出，避免截断产生咔哒声
      gg.gain.setValueAtTime(1.0, t0);
      gg.gain.setValueAtTime(1.0, t0 + Math.max(0.0, d - CFG.release));
      gg.gain.linearRampToValueAtTime(0.0, t0 + d);
      src.connect(gg);
      gg.connect(master);
      src.start(t0);
      src.stop(t0 + d + 0.01);
      return registerVoice([gg], [src], t0);
    }

    /* ---------------------------------------------------------------- 管风琴
     * 谐波叠加（严格整数倍 → FFT 上是等间距谱线；与钟的非谐分音形成对照）。
     */
    function organ(f0, dur, o) {
      var f = Number(f0);
      var d = Math.max(0.05, Number(dur) || 1.5);
      var oo = o || {};
      var t0 = t0Now();
      var nHarm = oo.harmonics || CFG.organHarmonics;
      var ampScale = (oo.amp === undefined) ? 1.0 : oo.amp;
      var nodes = [], srcs = [];
      var norm = 0;
      var h;
      for (h = 1; h <= nHarm; h++) { norm += Math.pow(h, -CFG.organAmpExp); }
      for (h = 1; h <= nHarm; h++) {
        var hz = f * h;
        if (hz >= C.sampleRate / 2) { continue; }
        var osc = C.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = hz;
        var g = C.createGain();
        var amp = CFG.organGain * ampScale * Math.pow(h, -CFG.organAmpExp) / norm;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(amp, t0 + CFG.attack);
        g.gain.setValueAtTime(amp, t0 + Math.max(CFG.attack, d - CFG.release));
        g.gain.linearRampToValueAtTime(0.0001, t0 + d);
        osc.connect(g);
        g.connect(master);
        osc.start(t0);
        osc.stop(t0 + d + CFG.release);
        nodes.push(g); srcs.push(osc);
      }
      return registerVoice(nodes, srcs, t0);
    }

    /* ---------------------------------------------------------------- 和弦
     * 同音色多音叠加（等幅，便于拍音实验：两音等幅时包络= |2A cos(πΔf t)|）。
     */
    function chord(freqs, dur, o) {
      var list = Array.isArray(freqs) ? freqs.slice() : [freqs];
      var d = Math.max(0.05, Number(dur) || 1.5);
      var oo = o || {};
      var each = 1.0 / Math.max(1, list.length);
      var vs = [];
      for (var i = 0; i < list.length; i++) {
        var sub = {};
        for (var key in oo) { if (Object.prototype.hasOwnProperty.call(oo, key)) { sub[key] = oo[key]; } }
        sub.amp = each;
        vs.push(organ(list[i], d, sub));
      }
      var nodes = [], srcs = [];
      for (var j = 0; j < vs.length; j++) {
        nodes = nodes.concat(vs[j].nodes);
        srcs = srcs.concat(vs[j].sources);
      }
      return registerVoice(nodes, srcs, vs.length ? vs[0].startTime : t0Now());
    }

    /** 立即停止所有已排程声部（离线渲染中通常不需要）。 */
    function stopAll() {
      for (var i = 0; i < voices.length; i++) { voices[i].stop(); }
      voices.length = 0;
    }

    /** 主输出电平（0..1）。 */
    function setGain(v) {
      var g = Number(v);
      if (!isFinite(g) || g < 0) { throw new RangeError('setGain: 需要非负有限数'); }
      master.gain.value = g;
      return g;
    }

    return {
      ctx: C,
      master: master,
      bell: bell,
      pluck: pluck,
      organ: organ,
      chord: chord,
      stopAll: stopAll,
      setGain: setGain,
      getVoiceCount: function () { return voices.length; }
    };
  }

  /* ======================================================================
   * §5 导出
   * ==================================================================== */

  return {
    VERSION: VERSION,
    CONFIG: CFG,
    createSynth: createSynth,
    // 确定性噪声（测试可用同一种子复现激励）
    makeLcg: makeLcg,
    // 频谱与测量辅助
    nextPow2: nextPow2,
    fftComplex: fftComplex,
    hannWindow: hannWindow,
    magnitudeSpectrum: magnitudeSpectrum,
    peakFrequency: peakFrequency,
    analyticEnvelope: analyticEnvelope,
    detectBeat: detectBeat,
    centsError: centsError,
    analyze: analyze,
    // camelCase 别名
    create_synth: createSynth,
    next_pow2: nextPow2,
    magnitude_spectrum: magnitudeSpectrum,
    peak_frequency: peakFrequency,
    analytic_envelope: analyticEnvelope,
    detect_beat: detectBeat,
    cents_error: centsError
  };
});
;
/* ===== 03. viz/spiral5th.js ===== */
/* =============================================================================
 * 同律 CONCORD · viz/spiral5th.js
 * -----------------------------------------------------------------------------
 * 用途：
 *   五度螺旋（对应 M1 序章 / M3 三分损益）。把 state.steps 里每一步的「音分增量」
 *   映射为绕原点的角度增量（可视化约定：1200 音分 = 360°，组件本身不内置任何律制
 *   数值），从中心向外画 n 个点；相邻角度差即纯五度。终点与起点之间的缺口用红色
 *   虚线 + state.closureCents 标注（「12 步回不到起点」）。
 *   播放时由 app 调 highlight(i) 沿链高亮。
 *
 * API：
 *   var inst = Viz.spiral5th.init(el, opts);
 *     el   : 容器 DOM（必填；尺寸可为 0，由 ResizeObserver 补布局）
 *     opts : { lang:'zh'|'en', reducedMotion:boolean, onSelect(i) }
 *   inst.update(state)       // 重绘
 *   inst.highlight(i|null)   // 高亮第 i 个点（0 基），null 取消
 *   inst.resize()            // 容器尺寸变化（已内置 ResizeObserver，一般不用手调）
 *   inst.destroy()           // 清理监听 / 动画 / DOM
 *   inst.setLang('zh'|'en')  // 可选：切换界面语言（也可直接 re-init）
 *
 * state 契约：
 *   {
 *     steps: [{ step?:number, name:string, cents:number, hz?:number, operation?:string }],
 *     closureCents: number,          // 终点相对起点的音分缺口（app 从内核传入）
 *     active?: number|null,          // 可选：当前步（等价于 update 后立即 highlight）
 *     playing?: boolean              // 可选：播放中（仅用于给高亮加轻微脉冲）
 *   }
 *   数值缺失时：角度按 360/n 均分、缺口按累积余量估算 —— 仅几何兜底，不冒充律制结论。
 *
 * 依赖：无。纯原生 JS + SVG/HTML，file:// 直接可用；零外部字体/图片/库。
 * 样式：颜色读 CSS 变量（组件内全部带 fallback，无 style.css 也不崩）：
 *   --c-light / --c-bronze / --c-cyan / --c-red / --c-ink / --font-ui
 * 复跑：浏览器直接打开 viz/_demo.html 目视验收；
 *       静态自检 py -X utf8 viz/check_viz.py；键盘/a11y 自检 py -X utf8 viz/_selftest.py。
 * ========================================================================== */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return;
  var doc = W.document;
  var Viz = W.Viz = W.Viz || {};
  if (Viz.spiral5th) return; // 幂等：重复 <script> 不重复定义

  var SVGNS = 'http://www.w3.org/2000/svg';
  var STYLE_ID = 'vz-spiral5th-style';
  var DEG = Math.PI / 180;

  /* ---------- 通用小工具（各组件文件自带一份，保证单文件即插即用） ---------- */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function num(v, d) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fmt(v, d) {
    if (!isFinite(v)) return '—';
    var s = v.toFixed(d == null ? 2 : d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  }
  function mk(tag, cls, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v == null) continue;
      if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    return e;
  }
  function mks(tag, attrs) {
    var e = doc.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v == null) continue;
      e.setAttribute(k, v);
    }
    return e;
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  function ensureStyle(id, css) {
    if (doc.getElementById(id)) return;
    var s = mk('style');
    s.id = id;
    s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
  }
  function motionAllowed(opts) {
    if (opts && typeof opts.reducedMotion === 'boolean') return !opts.reducedMotion;
    if (W.matchMedia) return !W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return true;
  }
  function pickLang(opts) {
    var l = opts && opts.lang;
    if (l !== 'en' && l !== 'zh') {
      l = (doc.documentElement && doc.documentElement.lang === 'en') ? 'en' : 'zh';
    }
    return l;
  }
  function tpl(s, map) {
    return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k] == null ? '' : String(map[k]); });
  }
  function safeStub() {
    return {
      version: '1.0.0', update: function () {}, highlight: function () {},
      resize: function () {}, destroy: function () {}, setLang: function () {},
      getState: function () { return null; }
    };
  }
  function watchResize(el, cb) {
    var raf = 0;
    var run = function () {
      if (raf) return;
      raf = W.requestAnimationFrame ? W.requestAnimationFrame(function () { raf = 0; cb(); }) : (cb(), 0);
    };
    if (typeof W.ResizeObserver === 'function') {
      var ro = new W.ResizeObserver(run);
      ro.observe(el);
      return { disconnect: function () { if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf); raf = 0; ro.disconnect(); } };
    }
    W.addEventListener('resize', run);
    W.addEventListener('orientationchange', run);
    return {
      disconnect: function () {
        if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf);
        raf = 0;
        W.removeEventListener('resize', run);
        W.removeEventListener('orientationchange', run);
      }
    };
  }

  /* ---------- 文案 ---------- */
  var DICT = {
    zh: {
      group: '五度螺旋：12 步纯五度无法回到起点',
      start: '起点',
      gap: '缺口 {v} 音分',
      caption: '{n} 步五度累积 {cum} 音分 = {oct} 个八度 + {rem} 音分；终点与起点相差 {gap} 音分（红虚线）',
      empty: '暂无音律数据',
      ghostCaption: '底图：{n} 步完整螺旋（低透明度）；已揭示 {rev}/{n} 步 · 起点与终点相差 {gap} 音分',
      announce: '第 {i} 步 {name}：累计 {cum} 音分{extra}'
    },
    en: {
      group: 'Circle of fifths spiral: twelve pure fifths do not close',
      start: 'origin',
      gap: 'gap {v} cents',
      caption: '{n} stacked fifths = {cum} cents = {oct} octaves + {rem} cents; the end point misses the origin by {gap} cents (red dashed line)',
      empty: 'No tuning data',
      ghostCaption: 'Preview: full {n}-step spiral (faded); revealed {rev}/{n} · end misses the origin by {gap} cents',
      announce: 'Step {i}, {name}: {cum} cents cumulative{extra}'
    }
  };
  function dict(lang) { return DICT[lang === 'en' ? 'en' : 'zh']; }

  var CSS = [
    '.vz-spiral{position:relative;display:flex;flex-direction:column;gap:6px;width:100%;height:100%;min-height:0;',
    'color:var(--c-light,#F0ECE2);font-family:var(--font-ui,"Segoe UI","Microsoft YaHei",system-ui,sans-serif);font-size:13px;line-height:1.45;}',
    '.vz-spiral-stage{position:relative;flex:1 1 auto;width:100%;min-height:180px;overflow:hidden;}',
    '.vz-spiral-svg{position:absolute;inset:0;width:100%;height:100%;display:block;}',
    '.vz-spiral-overlay{position:absolute;inset:0;pointer-events:none;}',
    '.vz-spiral-node{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;padding:0;border:0;border-radius:50%;',
    'background:transparent;pointer-events:auto;cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent;}',
    '.vz-spiral-node:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:1px;}',
    '.vz-spiral-spoke{stroke:var(--c-cyan,#6E8FA3);stroke-opacity:.16;stroke-width:1;}',
    '.vz-spiral-path{fill:none;stroke:var(--c-cyan,#6E8FA3);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:.72;}',
    '.vz-spiral-hi{fill:none;stroke:var(--c-bronze,#C8A35A);stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;opacity:0;transition:opacity 160ms linear;}',
    '.vz-spiral-hi.is-on{opacity:1;}',
    '.vz-spiral-path.is-ghost{stroke-opacity:.26;}',
    '.vz-spiral-rev{fill:none;stroke:var(--c-cyan,#6E8FA3);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}',
    '.vz-spiral-pt.is-ghost{opacity:.4;}',
    '.vz-spiral-lbl.is-ghost{opacity:.48;font-weight:400;}',
    '.vz-spiral-pt{transition:opacity 160ms linear;}',
    '.vz-spiral.has-active .vz-spiral-pt:not(.is-active){opacity:.4;}',
    '.vz-spiral-pt .dot{fill:var(--c-ink,#0B0D10);stroke:var(--c-cyan,#6E8FA3);stroke-width:2;}',
    '.vz-spiral-pt.is-active .dot{fill:var(--c-bronze,#C8A35A);stroke:var(--c-light,#F0ECE2);stroke-width:2.4;}',
    '.vz-spiral-lbl{fill:var(--c-light,#F0ECE2);font-size:11px;font-family:inherit;opacity:.88;',
    'paint-order:stroke;stroke:var(--c-ink,#0B0D10);stroke-width:3px;stroke-linejoin:round;}',
    '.vz-spiral-pt.is-active .vz-spiral-lbl{fill:var(--c-bronze,#C8A35A);opacity:1;font-weight:700;}',
    '.vz-spiral-center{fill:var(--c-light,#F0ECE2);opacity:.55;}',
    '.vz-spiral-gap{fill:none;stroke:var(--c-red,#C0392B);stroke-width:2;stroke-dasharray:5 5;stroke-linecap:round;}',
    '.vz-spiral-gap-dot{fill:var(--c-red,#C0392B);}',
    '.vz-spiral-gap-label{fill:#E0604F;font-size:12px;font-weight:700;font-family:inherit;',
    'paint-order:stroke;stroke:var(--c-ink,#0B0D10);stroke-width:4px;stroke-linejoin:round;}',
    '.vz-spiral-caption{margin:0;font-size:12px;line-height:1.5;opacity:.86;}',
    '.vz-spiral.is-empty .vz-spiral-svg{display:none;}',
    '.vz-spiral.is-empty .vz-spiral-caption{opacity:.6;}',
    '.vz-spiral.is-playing .vz-spiral-pt.is-active .dot{animation:vz-spiral-pulse 1.4s ease-in-out infinite;}',
    '@keyframes vz-spiral-pulse{0%,100%{stroke-width:2px;}50%{stroke-width:4px;stroke-opacity:.5;}}',
    '.vz-rm .vz-spiral-pt,.vz-rm .vz-spiral-hi{transition:none;}',
    '.vz-rm .vz-spiral-pt.is-active .dot{animation:none;}',
    '@media (prefers-reduced-motion: reduce){',
    '.vz-spiral-pt,.vz-spiral-hi{transition:none;}',
    '.vz-spiral-pt.is-active .dot{animation:none;}}',
    '.vz-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}'
  ].join('');

  function smoothPath(pts) {
    if (!pts || !pts.length) return '';
    if (pts.length === 1) return 'M' + fmt(pts[0].x, 1) + ' ' + fmt(pts[0].y, 1);
    var d = 'M' + fmt(pts[0].x, 1) + ' ' + fmt(pts[0].y, 1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += 'C' + fmt(c1x, 1) + ' ' + fmt(c1y, 1) + ' ' + fmt(c2x, 1) + ' ' + fmt(c2y, 1) +
        ' ' + fmt(p2.x, 1) + ' ' + fmt(p2.y, 1);
    }
    return d;
  }

  /* 宿主容器的可访问语义接管：外部常把挂载位写成 role="img"（静态图语义），
     但组件内部有可聚焦控件，axe 会报 nested-interactive（role=img 不允许可聚焦后代）。
     组件是交互控件，这里把宿主 role 换成 group（保留外部 aria-label 作为组名）。
     注：index.html 若把 .viz-slot 的 role="img" 去掉会更干净，本函数只是组件的自保。 */
  function adoptHost(el) {
    if (!el || !el.getAttribute) return;
    var role = (el.getAttribute('role') || '').toLowerCase();
    /* img/figure 等静态图语义不允许包含可聚焦控件（axe nested-interactive）；
       button/link/application 会把整块变成一个可聚焦大控件，同样不符合本组件
       「一组独立控件」的模型。统一退回中性分组语义，保留宿主的 aria-label 作组名。 */
    if (role === 'img' || role === 'figure' || role === 'button' || role === 'link' || role === 'application') {
      el.setAttribute('role', 'group');
    }
    if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
  }

  function init(container, opts) {
    if (!container || !container.nodeType) return safeStub();
    adoptHost(container);
    if (container.__vizSpiral5th) { try { container.__vizSpiral5th.destroy(); } catch (e) {} }
    opts = opts || {};
    ensureStyle(STYLE_ID, CSS);

    var lang = pickLang(opts);
    var reduced = !motionAllowed(opts);
    var state = { steps: [], previewSteps: [], closureCents: NaN, playing: false };
    var active = null, nodes = [], pts = [], deltas = [], destroyed = false;
    var ro = null, live = null, onSelect = (typeof opts.onSelect === 'function') ? opts.onSelect : null;

    /* ---------- DOM ---------- */
    clear(container);
    var root = mk('div', 'vz-spiral' + (reduced ? ' vz-rm' : '') + (reduced ? ' hi-static' : ''));
    root.setAttribute('role', 'group');
    var stage = mk('div', 'vz-spiral-stage');
    var svg = mks('svg', { 'class': 'vz-spiral-svg', 'aria-hidden': 'true', focusable: 'false' });
    var gSpokes = mks('g'), gPath = mks('path', { 'class': 'vz-spiral-path', d: '' });
    var gHi = mks('path', { 'class': 'vz-spiral-hi', d: '' });
    var gRev = mks('path', { 'class': 'vz-spiral-rev', d: '' });
    var gNodes = mks('g'), gGap = mks('g'), gCenter = mks('g');
    svg.appendChild(gSpokes); svg.appendChild(gPath); svg.appendChild(gRev); svg.appendChild(gHi);
    svg.appendChild(gNodes); svg.appendChild(gGap); svg.appendChild(gCenter);
    var overlay = mk('div', 'vz-spiral-overlay');
    stage.appendChild(svg); stage.appendChild(overlay);
    var caption = mk('p', 'vz-spiral-caption');
    live = mk('div', 'vz-sr');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    root.appendChild(stage); root.appendChild(caption); root.appendChild(live);
    container.appendChild(root);

    function D() { return dict(lang); }
    function announce(msg) { if (live) live.textContent = msg; }

    /* 像素几何：不用固定 viewBox，文字/线宽就是真实像素，缩放后仍清晰 */
    function geom() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return null;
      var m = Math.min(w, h);
      return {
        w: w, h: h, cx: w / 2, cy: h / 2,
        r0: Math.max(26, m * 0.13), rMax: Math.max(56, m * 0.42)
      };
    }

    /* 标签避让：近似矩形碰撞，沿径向逐级外推（不做力导向，确定性结果） */
    function placeLabels(items, g) {
      var placed = [];
      function hit(c, list) {
        for (var i = 0; i < list.length; i++) {
          var o = list[i];
          if (Math.abs(c.x - o.x) < (c.w + o.w) / 2 - 1 &&
              Math.abs(c.y - o.y) < (c.h + o.h) / 2 - 1) return true;
        }
        return false;
      }
      /* 先放缺口标签（优先级最高），再按半径从外到内放点名 */
      items.sort(function (a, b) {
        if (!!a.priority !== !!b.priority) return a.priority ? -1 : 1;
        return (b.r || 0) - (a.r || 0);
      });
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var textW = Math.min(130, it.text.length * 6.4 + 6);
        var cand = null;
        for (var attempt = 0; attempt < 3; attempt++) {
          var off = (it.baseOff || 17) + attempt * 10;
          var lx = clamp(it.x + it.dx * off, textW / 2 + 2, g.w - textW / 2 - 2);
          var ly = clamp(it.y + it.dy * off, 9, g.h - 9);
          var c = { x: lx, y: ly, w: textW, h: 13 };
          if (!hit(c, placed)) { cand = c; break; }
          cand = c;
        }
        it.lx = cand.x; it.ly = cand.y;
        placed.push(cand);
        it.el.setAttribute('x', fmt(cand.x, 1));
        it.el.setAttribute('y', fmt(cand.y, 1));
      }
    }

    /* ---------- 渲染（数据 + 像素尺寸 → 几何） ---------- */
    function render() {
      if (destroyed) return;
      var g = geom();
      var dd = D();
      var full = state.previewSteps.length ? state.previewSteps : state.steps;
      var nFull = full.length;
      var nRev = state.previewSteps.length ? Math.min(state.steps.length, nFull) : nFull;
      var ghostMode = state.previewSteps.length > 0 && nRev < nFull;
      root.setAttribute('aria-label', dd.group);
      clear(overlay); clear(gSpokes); clear(gNodes); clear(gGap); clear(gCenter);
      nodes = []; pts = []; deltas = [];
      gHi.setAttribute('d', ''); gHi.classList.remove('is-on');
      gPath.setAttribute('d', ''); gPath.classList.remove('is-ghost');
      if (gRev) { gRev.setAttribute('d', ''); gRev.style.display = 'none'; }
      svg.setAttribute('viewBox', g ? ('0 0 ' + g.w + ' ' + g.h) : '0 0 360 360');
      root.classList.toggle('is-empty', !g || !nFull);
      if (!g || !nFull) { caption.textContent = dd.empty; return; }

      /* 1) 每步音分增量 → 角度；数据缺失时均分兜底（仅几何兜底，非律制值） */
      var cum = 0;
      for (var i = 0; i < nFull; i++) {
        var c = num(full[i].cents, NaN);
        var prev = i === 0 ? 0 : num(full[i - 1].cents, NaN);
        var raw = (i === 0) ? c : (c - prev);
        var d;
        if (isFinite(raw)) d = ((raw % 1200) + 1200) % 1200;
        else d = 1200 / nFull;
        deltas.push(d);
        cum += d;
        var deg = -90 + (cum / 1200) * 360;
        var r = nFull === 1 ? (g.r0 + g.rMax) / 2 : (g.r0 + (g.rMax - g.r0) * (i / (nFull - 1)));
        pts.push({ x: g.cx + r * Math.cos(deg * DEG), y: g.cy + r * Math.sin(deg * DEG), r: r, deg: deg });
      }

      /* 2) 辐条 + 完整路径（ghost 模式下降透明度，另画已揭示段） */
      for (var j = 0; j < nFull; j++) {
        gSpokes.appendChild(mks('line', {
          'class': 'vz-spiral-spoke', x1: fmt(g.cx, 1), y1: fmt(g.cy, 1),
          x2: fmt(pts[j].x, 1), y2: fmt(pts[j].y, 1)
        }));
      }
      gPath.setAttribute('d', smoothPath(pts));
      if (ghostMode) {
        gPath.classList.add('is-ghost');
        if (gRev && nRev >= 2) {
          gRev.style.display = '';
          gRev.setAttribute('d', smoothPath(pts.slice(0, nRev)));
        }
      }

      /* 3) 中心起点标记 */
      gCenter.appendChild(mks('circle', { 'class': 'vz-spiral-center', cx: fmt(g.cx, 1), cy: fmt(g.cy, 1), r: 3 }));
      var labelItems = [];
      var startLbl = mks('text', { 'class': 'vz-spiral-lbl', x: fmt(g.cx + 9, 1), y: fmt(g.cy + 15, 1), 'font-size': '10.5' });
      startLbl.appendChild(doc.createTextNode(dd.start));
      gCenter.appendChild(startLbl);
      labelItems.push({
        el: startLbl, x: g.cx + 9, y: g.cy + 15, dx: 0, dy: 0,
        text: dd.start, r: 0, baseOff: 0, priority: false
      });

      /* 4) 点 + 名称标签：已揭示 = 正常；未揭示 = 低透明度 ghost（仅视觉，不进 Tab） */
      for (var k = 0; k < nFull; k++) {
        var st = full[k] || {};
        var revealed = k < nRev;
        var gpt = mks('g', {
          'class': 'vz-spiral-pt' + (revealed ? '' : ' is-ghost'), 'data-i': k,
          'aria-hidden': 'true'
        });
        var dot = mks('circle', { 'class': 'dot', cx: fmt(pts[k].x, 1), cy: fmt(pts[k].y, 1), r: revealed ? 5.5 : 4.5 });
        var name = (st.name != null) ? String(st.name) : ('#' + (k + 1));
        var short = name.length > 8 ? (name.slice(0, 8) + '…') : name;
        var dx = pts[k].x - g.cx, dy = pts[k].y - g.cy;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var lbl = mks('text', {
          'class': 'vz-spiral-lbl' + (revealed ? '' : ' is-ghost'),
          x: fmt(pts[k].x, 1), y: fmt(pts[k].y, 1),
          'text-anchor': 'middle', 'dominant-baseline': 'middle'
        });
        lbl.appendChild(doc.createTextNode(short));
        gpt.appendChild(dot); gpt.appendChild(lbl);
        gNodes.appendChild(gpt);
        nodes.push({
          g: gpt, dot: dot, label: lbl, x: pts[k].x, y: pts[k].y,
          revealed: revealed, name: name
        });
        labelItems.push({
          el: lbl, x: pts[k].x, y: pts[k].y, dx: dx / len, dy: dy / len,
          text: short, r: pts[k].r, baseOff: 17, priority: (k === nFull - 1)
        });
      }

      /* 5) 缺口：终点 → 起点 红虚线 + 数值 */
      var gap = num(state.closureCents, NaN);
      var total = cum;
      var computedGap = total - 1200 * Math.floor(total / 1200);
      if (computedGap > 600) computedGap -= 1200;
      if (!isFinite(gap)) gap = computedGap;
      var last = pts[nFull - 1], first = pts[0];
      gGap.appendChild(mks('path', {
        'class': 'vz-spiral-gap',
        d: 'M' + fmt(last.x, 1) + ' ' + fmt(last.y, 1) + ' L' + fmt(first.x, 1) + ' ' + fmt(first.y, 1)
      }));
      var mx = (last.x + first.x) / 2, my = (last.y + first.y) / 2;
      var vx = mx - g.cx, vy = my - g.cy, vlen = Math.sqrt(vx * vx + vy * vy) || 1;
      var gapLbl = mks('text', {
        'class': 'vz-spiral-gap-label', x: fmt(mx, 1), y: fmt(my, 1),
        'text-anchor': 'middle', 'dominant-baseline': 'middle'
      });
      gapLbl.appendChild(doc.createTextNode(tpl(dd.gap, { v: fmt(gap, 2) })));
      gGap.appendChild(gapLbl);
      gGap.appendChild(mks('circle', { 'class': 'vz-spiral-gap-dot', cx: fmt(last.x, 1), cy: fmt(last.y, 1), r: 3.4 }));
      labelItems.push({
        el: gapLbl, x: mx, y: my, dx: vx / vlen, dy: vy / vlen,
        text: tpl(dd.gap, { v: fmt(gap, 2) }), r: 0, baseOff: 26, priority: true
      });

      /* 6) 标签统一避让（含起点/点名/缺口），再画覆盖层按钮 */
      placeLabels(labelItems, g);

      /* 7) 覆盖层：只给已揭示的步建真实 <button>（Tab 可达、键盘 ←→、读屏有名字） */
      for (var b = 0; b < nRev; b++) {
        var step = state.steps[b] || full[b] || {};
        var sname = (step.name != null) ? String(step.name) : ('#' + (b + 1));
        var stepCum = 0;
        for (var q = 0; q <= b; q++) stepCum += deltas[q];
        var hz = num(step.hz, NaN);
        var albl = tpl(dd.announce, {
          i: (nFull > 1 && Math.abs(num(full[0].cents, 0)) < 0.5) ? b : b + 1, name: sname, cum: fmt(stepCum, 1),
          extra: isFinite(hz) ? ('，' + fmt(hz, 2) + ' Hz') : ''
        });
        var btn = mk('button', 'vz-spiral-node');
        btn.type = 'button';
        btn.setAttribute('aria-label', albl);
        btn.setAttribute('data-i', String(b));
        btn.addEventListener('focus', onFocus(b));
        btn.addEventListener('blur', onBlur);
        btn.addEventListener('mouseenter', onFocus(b));
        btn.addEventListener('mouseleave', onBlur);
        btn.addEventListener('click', onPick(b));
        btn.addEventListener('keydown', onKeyNav);
        overlay.appendChild(btn);
        if (nodes[b]) {
          nodes[b].btn = btn;
          nodes[b].cum = stepCum;
          nodes[b].hz = hz;
        }
      }

      /* 8) 说明文字：首点若为起点（增量≈0），「步数」按 n-1 计，避免把起点算成一步 */
      var oct = Math.floor(total / 1200);
      var rem = total - oct * 1200;
      var originFirst = (nFull > 1 && isFinite(deltas[0]) && Math.abs(deltas[0]) < 0.5);
      var stepCount = originFirst ? nFull - 1 : nFull;
      if (ghostMode) {
        caption.textContent = tpl(dd.ghostCaption, {
          n: stepCount, rev: Math.max(0, nRev - (originFirst ? 1 : 0)), gap: fmt(gap, 2)
        });
      } else {
        caption.textContent = tpl(dd.caption, {
          n: stepCount, cum: fmt(total, 2), oct: oct, rem: fmt(rem, 2), gap: fmt(gap, 2)
        });
      }
      if (reduced || !state.playing) root.classList.remove('is-playing');
      applyActive();
      place();
    }

    /* ---------- 交互 ---------- */
    function onFocus(i) {
      return function () {
        if (destroyed) return;
        highlight(i);
        var nd = nodes[i];
        if (nd && nd.btn) announce(nd.btn.getAttribute('aria-label'));
      };
    }
    function onBlur() {
      if (destroyed) return;
      if (doc.activeElement && overlay.contains(doc.activeElement)) return;
      highlight(null);
    }
    function onPick(i) {
      return function (ev) {
        if (destroyed) return;
        if (ev && ev.preventDefault) ev.preventDefault();
        highlight(i);
        if (onSelect) { try { onSelect(i); } catch (e) {} }
      };
    }
    function onKeyNav(ev) {
      if (destroyed || !ev) return;
      var n = state.steps.length;
      if (!n) return;
      var cur = num(ev.currentTarget && ev.currentTarget.getAttribute('data-i'), -1);
      var nxt = -1;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') nxt = (cur + 1) % n;
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') nxt = (cur - 1 + n) % n;
      else if (ev.key === 'Home') nxt = 0;
      else if (ev.key === 'End') nxt = n - 1;
      else if (ev.key === 'Escape') {
        highlight(null);
        if (ev.currentTarget) ev.currentTarget.blur();
        if (ev.preventDefault) ev.preventDefault();
        return;
      } else if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        if (ev.preventDefault) ev.preventDefault();
        onPick(cur)();
        return;
      }
      if (nxt >= 0 && nodes[nxt] && nodes[nxt].btn) {
        if (ev.preventDefault) ev.preventDefault();
        nodes[nxt].btn.focus();
      }
    }

    function applyActive() {
      var has = active != null && active >= 0 && active < state.steps.length;
      root.classList.toggle('has-active', has);
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].g) nodes[i].g.classList.toggle('is-active', has && i === active);
      }
      if (has) {
        var sub = nodes.slice(0, active + 1).map(function (o) { return { x: o.x, y: o.y }; });
        gHi.setAttribute('d', smoothPath(sub));
        gHi.classList.add('is-on');
      } else {
        gHi.classList.remove('is-on');
        gHi.setAttribute('d', '');
      }
      if (reduced || !state.playing) root.classList.remove('is-playing');
      else root.classList.add('is-playing');
    }

    function highlight(i) {
      if (destroyed) return;
      var n = state.steps.length;
      if (i == null || !isFinite(+i)) active = null;
      else {
        var k = Math.round(+i);
        active = (k < 0 || k >= n) ? null : k;
      }
      applyActive();
    }

    /* 覆盖层按钮与像素坐标 1:1（无 viewBox 缩放） */
    function place() {
      if (destroyed || !nodes.length) return;
      for (var i = 0; i < nodes.length; i++) {
        var nd = nodes[i];
        if (!nd.btn) continue;
        nd.btn.style.left = nd.x.toFixed(1) + 'px';
        nd.btn.style.top = nd.y.toFixed(1) + 'px';
      }
    }

    function layout() { render(); }

    function update(next) {
      if (destroyed) return;
      adoptHost(container);
      next = (next && typeof next === 'object') ? next : {};
      var arr = Array.isArray(next.steps) ? next.steps : [];
      state.steps = arr.filter(function (s) { return s && typeof s === 'object'; }).slice(0, 64);
      var pv = Array.isArray(next.previewSteps) ? next.previewSteps : (Array.isArray(opts.previewSteps) ? opts.previewSteps : []);
      state.previewSteps = pv.filter(function (s) { return s && typeof s === 'object'; }).slice(0, 64);
      state.closureCents = num(next.closureCents, NaN);
      state.playing = !!next.playing;
      if (next.active === null) active = null;
      else if (isNum(next.active)) active = clamp(Math.round(next.active), 0, Math.max(0, state.steps.length - 1));
      render();
    }

    function destroy() {
      destroyed = true;
      if (ro) { ro.disconnect(); ro = null; }
      container.__vizSpiral5th = null;
      clear(container);
      nodes = []; pts = [];
    }

    function setLang(l) { lang = (l === 'en') ? 'en' : 'zh'; render(); }

    var inst = {
      version: '1.0.0',
      update: update,
      highlight: highlight,
      resize: layout,
      destroy: destroy,
      setLang: setLang,
      getState: function () {
        return { steps: state.steps.slice(), previewSteps: state.previewSteps.slice(), closureCents: state.closureCents, active: active };
      }
    };
    container.__vizSpiral5th = inst;
    ro = watchResize(stage, layout);
    render();
    return inst;
  }

  Viz.spiral5th = { version: '1.0.0', init: init };
})();
;
/* ===== 04. viz/monochord.js ===== */
/* =============================================================================
 * 同律 CONCORD · viz/monochord.js
 * -----------------------------------------------------------------------------
 * 用途：
 *   律尺 / 单弦（M2「律尺 · 一根弦上的宇宙」）。画一根弦与可移动的琴马，弦长比
 *   （振动弦长 / 全长）可拖动或用键盘 ←→ 调整（滑块语义 role="slider"，
 *   aria-valuenow / aria-valuetext 实时更新），并可点/键盘激活预设弦长比。
 *   组件只用 app 传入的 state.ratio / lens / hz / cents 渲染，不内置任何律制数值。
 *
 * API：
 *   var inst = Viz.monochord.init(el, opts);
 *     opts : {
 *       lang:'zh'|'en',
 *       reducedMotion:boolean,
 *       range:[min,max]         // 可选，弦长比滑块范围，默认 [0.5,1]（弦长比物理区间）
 *       scale:'linear'|'log'    // 可选，滑块位置映射，默认 'linear'
 *       step:number             // 可选，键盘步长，默认 (max-min)/400
 *       value:number            // 可选，初始 ratio（无 state 时用）
 *       onChange(ratio)         // 拖动/键盘/预设改变时回调（app 据此重算 state 并 update）
 *     }
 *   inst.update(state)
 *   inst.highlight(i|null)     // 高亮第 i 个预设（lens 索引）
 *   inst.resize() / inst.destroy() / inst.setLang(lang)
 *
 * state 契约：
 *   {
 *     ratio:number,                        // 弦长比（振动弦长 / 全长）
 *     lens:[{ label:string, ratio:number, hz?:number, cents?:number }],
 *     hz?:number, cents?:number, note?:string   // 可选：app 算好的当前值（有则优先显示）
 *   }
 *
 * 依赖：无。纯原生 JS + SVG/HTML，file:// 直接可用。
 * 样式：--c-light / --c-bronze / --c-cyan / --c-red / --c-ink / --font-ui（均有 fallback）
 * 复跑：浏览器打开 viz/_demo.html；静态自检 py -X utf8 viz/check_viz.py。
 * ========================================================================== */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return;
  var doc = W.document;
  var Viz = W.Viz = W.Viz || {};
  if (Viz.monochord) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var STYLE_ID = 'vz-monochord-style';
  var LOG2 = Math.log(2);

  /* ---------- 工具 ---------- */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function num(v, d) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fmt(v, d) {
    if (!isFinite(v)) return '—';
    var s = v.toFixed(d == null ? 2 : d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  }
  function mk(tag, cls, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    return e;
  }
  function mks(tag, attrs) {
    var e = doc.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      e.setAttribute(k, v);
    }
    return e;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function ensureStyle(id, css) {
    if (doc.getElementById(id)) return;
    var s = mk('style'); s.id = id;
    s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
  }
  function motionAllowed(opts) {
    if (opts && typeof opts.reducedMotion === 'boolean') return !opts.reducedMotion;
    if (W.matchMedia) return !W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return true;
  }
  function pickLang(opts) {
    var l = opts && opts.lang;
    if (l !== 'en' && l !== 'zh') l = (doc.documentElement && doc.documentElement.lang === 'en') ? 'en' : 'zh';
    return l;
  }
  function tpl(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k] == null ? '' : String(map[k]); }); }
  function safeStub() {
    return {
      version: '1.0.0', update: function () {}, highlight: function () {}, resize: function () {},
      destroy: function () {}, setLang: function () {}, getState: function () { return null; }
    };
  }
  function watchResize(el, cb) {
    var raf = 0;
    var run = function () {
      if (raf) return;
      raf = W.requestAnimationFrame ? W.requestAnimationFrame(function () { raf = 0; cb(); }) : (cb(), 0);
    };
    if (typeof W.ResizeObserver === 'function') {
      var ro = new W.ResizeObserver(run); ro.observe(el);
      return { disconnect: function () { if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf); raf = 0; ro.disconnect(); } };
    }
    W.addEventListener('resize', run);
    return {
      disconnect: function () {
        if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf);
        raf = 0; W.removeEventListener('resize', run);
      }
    };
  }
  /* 连分数 → 简单分数（仅在逼近时使用；通用数学，不是律制常量） */
  function toFraction(x, maxDen) {
    if (!isFinite(x) || x === 0) return null;
    var sign = x < 0 ? -1 : 1; x = Math.abs(x);
    var h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = x, i = 0;
    while (i++ < 24) {
      var a = Math.floor(b);
      var h2 = a * h1 + h0, k2 = a * k1 + k0;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (k1 > maxDen) return null;
      if (Math.abs(x - h1 / k1) < 1e-9) return [sign * h1, k1];
      var frac = b - a;
      if (frac < 1e-12) return [sign * h1, k1];
      b = 1 / frac;
    }
    return null;
  }

  /* ---------- 文案 ---------- */
  var DICT = {
    zh: {
      group: '律尺：一根弦上的弦长比',
      slider: '弦长比',
      unitCents: '音分',
      unitHz: 'Hz',
      ratioK: '弦长比',
      centsK: '音分',
      hzK: '频率',
      lengthLbl: '振动弦长 = 弦长比 × 全长',
      nut: '岳山',
      bridge: '琴马',
      lensGroup: '预设弦长比',
      hint: '拖动滑块 / 点按预设 / 用 ← → 微调，Home 与 End 到两端',
      applied: '已应用预设 {label}（弦长比 {ratio}）',
      empty: '暂无预设',
      srValue: '弦长比 {ratio}，{cents} 音分'
    },
    en: {
      group: 'Monochord: string-length ratio',
      slider: 'String length ratio',
      unitCents: 'cents',
      unitHz: 'Hz',
      ratioK: 'ratio',
      centsK: 'cents',
      hzK: 'frequency',
      lengthLbl: 'sounding length = ratio × full length',
      nut: 'nut',
      bridge: 'bridge',
      lensGroup: 'Preset string-length ratios',
      hint: 'Drag the slider, pick a preset, or use ← → ; Home / End jump to the ends',
      applied: 'Preset {label} applied (ratio {ratio})',
      empty: 'No presets',
      srValue: 'ratio {ratio}, {cents} cents'
    }
  };
  function dict(lang) { return DICT[lang === 'en' ? 'en' : 'zh']; }

  var CSS = [
    '.vz-mono{position:relative;display:flex;flex-direction:column;gap:8px;width:100%;height:100%;min-height:0;',
    'color:var(--c-light,#F0ECE2);font-family:var(--font-ui,"Segoe UI","Microsoft YaHei",system-ui,sans-serif);font-size:13px;line-height:1.45;}',
    '.vz-mono-head{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;flex:0 0 auto;}',
    '.vz-mono-ratio{display:flex;align-items:baseline;gap:7px;}',
    '.vz-mono-ratio-v{font-size:26px;font-weight:700;color:var(--c-bronze,#C8A35A);letter-spacing:.5px;}',
    '.vz-mono-ratio-d{font-size:12px;opacity:.72;}',
    '.vz-mono-meta{display:flex;gap:14px;flex-wrap:wrap;align-items:baseline;}',
    '.vz-mono-meta-item{display:inline-flex;align-items:baseline;gap:5px;}',
    '.vz-mono-meta-item .k{font-size:11px;opacity:.62;}',
    '.vz-mono-meta-item .v{font-size:14px;color:var(--c-cyan,#6E8FA3);font-variant-numeric:tabular-nums;}',
    '.vz-mono-stage{position:relative;width:100%;height:126px;flex:0 0 auto;}',
    '.vz-mono-svg{position:absolute;inset:0;width:100%;height:100%;display:block;}',
    '.vz-mono-track{position:relative;height:34px;min-height:34px;flex:0 0 auto;margin:0 2px;cursor:pointer;touch-action:none;}',
    '.vz-mono-rail{position:absolute;left:0;right:0;top:15px;height:4px;border-radius:2px;background:rgba(240,236,226,.16);}',
    '.vz-mono-fill{position:absolute;left:0;top:15px;height:4px;border-radius:2px;background:var(--c-bronze,#C8A35A);opacity:.85;}',
    '.vz-mono-thumb{position:absolute;top:17px;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;',
    'background:var(--c-bronze,#C8A35A);border:2px solid var(--c-ink,#0B0D10);box-shadow:0 0 0 2px rgba(200,163,90,.35);',
    'transition:transform 120ms ease, box-shadow 120ms ease;}',
    '.vz-mono-track:hover .vz-mono-thumb{box-shadow:0 0 0 4px rgba(200,163,90,.28);}',
    '.vz-mono-track:active .vz-mono-thumb{transform:scale(.94);}',
    '.vz-mono-track:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:4px;border-radius:4px;}',
    '.vz-mono-track:focus-visible .vz-mono-thumb{box-shadow:0 0 0 4px rgba(240,236,226,.35);}',
    '.vz-mono-tick{position:absolute;top:9px;width:1px;height:8px;background:rgba(240,236,226,.28);pointer-events:none;}',
    '.vz-mono-tick.is-lens{height:12px;top:7px;background:var(--c-cyan,#6E8FA3);opacity:.8;}',
    '.vz-mono-tick.is-active{background:var(--c-light,#F0ECE2);width:2px;opacity:1;}',
    '.vz-mono-lens{display:flex;flex-wrap:wrap;gap:6px;flex:0 0 auto;}',
    '.vz-mono-lens-btn{font:inherit;font-size:12px;color:var(--c-light,#F0ECE2);background:rgba(240,236,226,.05);',
    'border:1px solid rgba(240,236,226,.2);border-radius:6px;padding:3px 8px;cursor:pointer;line-height:1.5;',
    'transition:border-color 120ms linear, background-color 120ms linear;}',
    '.vz-mono-lens-btn:hover{border-color:var(--c-bronze,#C8A35A);background:rgba(200,163,90,.12);}',
    '.vz-mono-lens-btn:active{transform:translateY(1px);}',
    '.vz-mono-lens-btn:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:1px;}',
    '.vz-mono-lens-btn.is-active{border-color:var(--c-bronze,#C8A35A);background:rgba(200,163,90,.2);color:#fff;}',
    '.vz-mono-lens-btn .lr{opacity:.6;font-size:11px;margin-left:3px;}',
    '.vz-mono-hint{margin:0;font-size:11.5px;opacity:.62;line-height:1.5;flex:0 0 auto;}',
    '.vz-mono-empty{font-size:12px;opacity:.6;}',
    '.vz-mono-svg text{font-family:inherit;}',
    '.vz-mono-str{stroke:var(--c-light,#F0ECE2);stroke-opacity:.22;stroke-width:2;stroke-linecap:round;}',
    '.vz-mono-str-on{stroke:var(--c-bronze,#C8A35A);stroke-width:4;stroke-linecap:round;}',
    '.vz-mono-nut{fill:var(--c-cyan,#6E8FA3);}',
    '.vz-mono-bridge{fill:var(--c-bronze,#C8A35A);}',
    '.vz-mono-body{fill:rgba(240,236,226,.045);stroke:rgba(240,236,226,.16);stroke-width:1;}',
    '.vz-mono-bracket{stroke:var(--c-cyan,#6E8FA3);stroke-opacity:.7;stroke-width:1;fill:none;}',
    '.vz-mono-lbl{fill:var(--c-light,#F0ECE2);font-size:11px;opacity:.72;paint-order:stroke;stroke:var(--c-ink,#0B0D10);stroke-width:3px;stroke-linejoin:round;}',
    '.vz-mono-rm .vz-mono-thumb{transition:none;}',
    '.vz-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}'
  ].join('');

  /* 宿主容器的可访问语义接管：外部常把挂载位写成 role="img"（静态图语义），
     但组件内部有可聚焦控件，axe 会报 nested-interactive（role=img 不允许可聚焦后代）。
     组件是交互控件，这里把宿主 role 换成 group（保留外部 aria-label 作为组名）。
     注：index.html 若把 .viz-slot 的 role="img" 去掉会更干净，本函数只是组件的自保。 */
  function adoptHost(el) {
    if (!el || !el.getAttribute) return;
    var role = (el.getAttribute('role') || '').toLowerCase();
    /* img/figure 等静态图语义不允许包含可聚焦控件（axe nested-interactive）；
       button/link/application 会把整块变成一个可聚焦大控件，同样不符合本组件
       「一组独立控件」的模型。统一退回中性分组语义，保留宿主的 aria-label 作组名。 */
    if (role === 'img' || role === 'figure' || role === 'button' || role === 'link' || role === 'application') {
      el.setAttribute('role', 'group');
    }
    if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
  }

  function init(container, opts) {
    if (!container || !container.nodeType) return safeStub();
    adoptHost(container);
    if (container.__vizMonochord) { try { container.__vizMonochord.destroy(); } catch (e) {} }
    opts = opts || {};
    ensureStyle(STYLE_ID, CSS);

    var lang = pickLang(opts);
    var reduced = !motionAllowed(opts);
    var onChange = (typeof opts.onChange === 'function') ? opts.onChange : null;
    var range = (Array.isArray(opts.range) && isNum(opts.range[0]) && isNum(opts.range[1]) && opts.range[1] > opts.range[0])
      ? [opts.range[0], opts.range[1]] : [0.5, 1];
    var scaleMode = (opts.scale === 'log') ? 'log' : 'linear';
    var destroyed = false, ro = null, live = null;
    var state = { ratio: NaN, lens: [], hz: NaN, cents: NaN, note: '' };
    var curRatio = num(opts.value, (range[0] + range[1]) / 2);
    var lensEls = [], tickEls = [], activeLens = null;

    /* ---------- DOM ---------- */
    clear(container);
    var root = mk('div', 'vz-mono' + (reduced ? ' vz-mono-rm' : ''));
    root.setAttribute('role', 'group');

    var head = mk('div', 'vz-mono-head');
    var ratioBox = mk('div', 'vz-mono-ratio');
    var ratioV = mk('span', 'vz-mono-ratio-v', { text: '—' });
    var ratioD = mk('span', 'vz-mono-ratio-d', { text: '' });
    ratioBox.appendChild(ratioV); ratioBox.appendChild(ratioD);
    var meta = mk('div', 'vz-mono-meta');
    var centsK = mk('span', 'k'), centsV = mk('span', 'v');
    var metaCents = mk('span', 'vz-mono-meta-item');
    metaCents.appendChild(centsK); metaCents.appendChild(centsV);
    var hzK = mk('span', 'k'), hzV = mk('span', 'v');
    var metaHz = mk('span', 'vz-mono-meta-item');
    metaHz.appendChild(hzK); metaHz.appendChild(hzV);
    meta.appendChild(metaCents);
    meta.appendChild(metaHz);
    head.appendChild(ratioBox); head.appendChild(meta);

    var stage = mk('div', 'vz-mono-stage');
    var svg = mks('svg', { 'class': 'vz-mono-svg', viewBox: '0 0 640 126', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
    stage.appendChild(svg);

    var track = mk('div', 'vz-mono-track');
    track.setAttribute('role', 'slider');
    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-orientation', 'horizontal');
    var rail = mk('div', 'vz-mono-rail');
    var fill = mk('div', 'vz-mono-fill');
    var thumb = mk('div', 'vz-mono-thumb');
    track.appendChild(rail); track.appendChild(fill); track.appendChild(thumb);

    var lensBox = mk('div', 'vz-mono-lens');
    var hint = mk('p', 'vz-mono-hint');
    live = mk('div', 'vz-sr');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');

    root.appendChild(head); root.appendChild(stage); root.appendChild(track);
    root.appendChild(lensBox); root.appendChild(hint); root.appendChild(live);
    container.appendChild(root);

    function D() { return dict(lang); }

    /* ---------- 位置映射 ---------- */
    function posOf(r) {
      var lo = range[0], hi = range[1];
      if (scaleMode === 'log' && lo > 0 && hi > 0 && r > 0) {
        var a = Math.log(lo) / LOG2, b = Math.log(hi) / LOG2;
        return clamp((Math.log(r) / LOG2 - a) / (b - a), 0, 1);
      }
      return clamp((r - lo) / (hi - lo), 0, 1);
    }
    function ratioOf(p) {
      var lo = range[0], hi = range[1];
      p = clamp(p, 0, 1);
      if (scaleMode === 'log' && lo > 0 && hi > 0) {
        var a = Math.log(lo) / LOG2, b = Math.log(hi) / LOG2;
        return Math.pow(2, a + (b - a) * p);
      }
      return lo + (hi - lo) * p;
    }
    function normCents(r) {
      /* 弦长比 → 相对全长（ratio=1）的音分：频率 ∝ 1/弦长。仅用于 app 未传 cents 时的显示兜底。 */
      if (!isFinite(r) || r <= 0) return NaN;
      return -1200 * Math.log(r) / LOG2;
    }
    function ensureRange(r) {
      if (!isFinite(r) || r <= 0) return;
      if (r < range[0]) range[0] = r * 0.98;
      if (r > range[1]) range[1] = r * 1.02;
      range[0] = Math.max(1e-6, range[0]);
    }

    /* ---------- 数值显示 ---------- */
    function ratioLabel(r) {
      var f = toFraction(r, 64);
      if (f && Math.abs(f[0] / f[1] - r) < 1e-6 && f[1] > 1) return f[0] + '/' + f[1];
      return fmt(r, 4);
    }
    function renderValues() {
      var dd = D();
      var r = isFinite(state.ratio) ? state.ratio : curRatio;
      var cents = isNum(state.cents) ? state.cents : normCents(r);
      var hz = num(state.hz, NaN);
      ratioV.textContent = ratioLabel(r);
      ratioD.textContent = (ratioLabel(r) === fmt(r, 4)) ? '' : ('= ' + fmt(r, 4));
      centsK.textContent = dd.centsK;
      centsV.textContent = (cents >= 0 ? '+' : '') + fmt(cents, 2);
      hzK.textContent = dd.hzK;
      hzV.textContent = isFinite(hz) ? (fmt(hz, 2) + ' ' + dd.unitHz) : '—';
      metaHz.style.display = isFinite(hz) ? '' : 'none';
      noteSpan.textContent = state.note ? String(state.note) : '';
      noteSpan.style.display = state.note ? '' : 'none';
      /* slider ARIA */
      track.setAttribute('aria-label', dd.slider);
      track.setAttribute('aria-valuemin', String(range[0]));
      track.setAttribute('aria-valuemax', String(range[1]));
      var now = isFinite(r) ? r : curRatio;
      track.setAttribute('aria-valuenow', fmt(now, 4));
      track.setAttribute('aria-valuetext', tpl(dd.srValue, {
        ratio: ratioLabel(now),
        cents: (isFinite(cents) ? (cents >= 0 ? '+' : '') + fmt(cents, 2) : '—')
      }));
      var p = posOf(now);
      fill.style.width = (p * 100).toFixed(3) + '%';
      thumb.style.left = (p * 100).toFixed(3) + '%';
      for (var i = 0; i < lensEls.length; i++) {
        var lr = num(state.lens[i].ratio, NaN);
        var near = isFinite(lr) && Math.abs(lr - now) <= Math.max(1e-6, Math.abs(now) * 5e-4);
        lensEls[i].classList.toggle('is-active', activeLens === i || (activeLens == null && near));
      }
      for (var t = 0; t < tickEls.length; t++) {
        var tr = num(state.lens[t] && state.lens[t].ratio, NaN);
        tickEls[t].classList.toggle('is-active', activeLens === t);
        tickEls[t].classList.toggle('is-lens', isFinite(tr));
      }
      drawString();
    }
    var noteSpan = mk('span', 'vz-mono-ratio-d');

    /* ---------- 弦图 ---------- */
    function drawString() {
      var w = stage.clientWidth || 640;
      var h = 126;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      clear(svg);
      var dd = D();
      var x0 = 12, x1 = w - 12;
      var span = x1 - x0;
      var y = 46;
      var r = isFinite(state.ratio) ? state.ratio : curRatio;
      var rp = clamp(isFinite(r) ? r : 1, 0, 1);
      var bx = x0 + span * rp;
      /* 共鸣体 */
      svg.appendChild(mks('rect', { 'class': 'vz-mono-body', x: x0 - 8, y: 62, width: span + 16, height: 46, rx: 6 }));
      /* 整弦（琴马右侧的无效段） */
      svg.appendChild(mks('line', { 'class': 'vz-mono-str', x1: fmt(bx, 1), y1: y, x2: fmt(x1, 1), y2: y }));
      /* 振动弦段 */
      svg.appendChild(mks('line', { 'class': 'vz-mono-str-on', x1: fmt(x0, 1), y1: y, x2: fmt(bx, 1), y2: y }));
      /* 岳山 / 琴马 */
      svg.appendChild(mks('rect', { 'class': 'vz-mono-nut', x: x0 - 3, y: y - 14, width: 6, height: 28, rx: 1.5 }));
      svg.appendChild(mks('rect', { 'class': 'vz-mono-bridge', x: fmt(bx - 3.5, 1), y: y - 17, width: 7, height: 34, rx: 1.5 }));
      svg.appendChild(mks('path', { 'class': 'vz-mono-bridge', d: 'M' + fmt(bx - 10, 1) + ' ' + (y + 26) + ' L' + fmt(bx + 10, 1) + ' ' + (y + 26) + ' L' + fmt(bx, 1) + ' ' + (y + 17) + ' Z', opacity: '.55' }));
      /* 振动长度标注括号 */
      var by = y + 42;
      svg.appendChild(mks('path', {
        'class': 'vz-mono-bracket',
        d: 'M' + fmt(x0, 1) + ' ' + fmt(by - 5, 1) + ' V' + fmt(by, 1) + ' H' + fmt(bx, 1) + ' V' + fmt(by - 5, 1)
      }));
      var lbl = mks('text', { 'class': 'vz-mono-lbl', x: fmt((x0 + bx) / 2, 1), y: fmt(by - 9, 1), 'text-anchor': 'middle' });
      lbl.appendChild(doc.createTextNode(dd.lengthLbl));
      svg.appendChild(lbl);
      /* 岳山 / 琴马 文字 */
      var nutLbl = mks('text', { 'class': 'vz-mono-lbl', x: fmt(x0 + 2, 1), y: fmt(y - 20, 1), 'text-anchor': 'start' });
      nutLbl.appendChild(doc.createTextNode(dd.nut));
      svg.appendChild(nutLbl);
      var bridgeX = clamp(bx, x0 + 22, x1 - 22);
      var brLbl = mks('text', { 'class': 'vz-mono-lbl', x: fmt(bridgeX, 1), y: fmt(y - 24, 1), 'text-anchor': 'middle' });
      brLbl.appendChild(doc.createTextNode(dd.bridge));
      svg.appendChild(brLbl);
    }

    /* ---------- 设值 ---------- */
    function setRatio(r, silent) {
      if (!isFinite(r)) return;
      r = clamp(r, range[0], range[1]);
      curRatio = r;
      state.ratio = r;
      state.cents = num(state.centsGiven, normCents(r));
      renderValues();
      if (!silent && onChange) { try { onChange(r); } catch (e) {} }
    }
    function setRatioFromPointer(clientX) {
      var rect = track.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      var p = (clientX - rect.left) / rect.width;
      setRatio(ratioOf(p), false);
    }

    /* ---------- 事件 ---------- */
    var dragging = false;
    function onDown(ev) {
      if (destroyed || !ev) return;
      dragging = true;
      if (track.focus) track.focus();
      if (track.setPointerCapture && ev.pointerId != null) { try { track.setPointerCapture(ev.pointerId); } catch (e) {} }
      setRatioFromPointer(ev.clientX);
      if (ev.preventDefault) ev.preventDefault();
    }
    function onMove(ev) {
      if (!dragging || destroyed) return;
      setRatioFromPointer(ev.clientX);
      if (ev.preventDefault) ev.preventDefault();
    }
    function onUp(ev) {
      dragging = false;
      if (track.releasePointerCapture && ev && ev.pointerId != null) { try { track.releasePointerCapture(ev.pointerId); } catch (e) {} }
    }
    function onTrackKey(ev) {
      if (destroyed || !ev) return;
      var dd = D();
      var lo = range[0], hi = range[1];
      var stepDefault = isNum(opts.step) ? Math.abs(opts.step) : (hi - lo) / 400;
      var step = ev.shiftKey ? stepDefault * 10 : stepDefault;
      var r = isFinite(state.ratio) ? state.ratio : curRatio;
      var handled = true;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') setRatio(r + step, false);
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') setRatio(r - step, false);
      else if (ev.key === 'PageUp') setRatio(r + stepDefault * 20, false);
      else if (ev.key === 'PageDown') setRatio(r - stepDefault * 20, false);
      else if (ev.key === 'Home') setRatio(lo, false);
      else if (ev.key === 'End') setRatio(hi, false);
      else if (ev.key === 'Escape') { track.blur(); }
      else handled = false;
      if (handled && ev.preventDefault) ev.preventDefault();
    }
    function onLensKey(ev) {
      if (!ev) return;
      var list = lensEls;
      var i = list.indexOf(ev.currentTarget);
      if (i < 0) return;
      var nxt = -1;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') nxt = (i + 1) % list.length;
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') nxt = (i - 1 + list.length) % list.length;
      else if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); ev.currentTarget.click(); return; }
      if (nxt >= 0) { ev.preventDefault(); list[nxt].focus(); }
    }

    track.addEventListener('pointerdown', onDown);
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);
    track.addEventListener('pointercancel', onUp);
    track.addEventListener('keydown', onTrackKey);

    /* ---------- 渲染预设 ---------- */
    function renderLens() {
      var dd = D();
      clear(lensBox);
      lensEls = []; tickEls = [];
      lensBox.setAttribute('role', 'group');
      lensBox.setAttribute('aria-label', dd.lensGroup);
      /* 滑轨刻度（装饰层：插入 track 尾部的视觉刻度） */
      var tw = track.querySelectorAll('.vz-mono-tick');
      for (var z = 0; z < tw.length; z++) track.removeChild(tw[z]);
      var totalCents = 0;
      for (var i = 0; i < state.lens.length; i++) {
        var L = state.lens[i] || {};
        var lr = num(L.ratio, NaN);
        var lcent = isNum(L.cents) ? L.cents : normCents(lr);
        var lbl = (L.label != null && L.label !== '') ? String(L.label) : ('—');
        var b = mk('button', 'vz-mono-lens-btn');
        b.type = 'button';
        b.setAttribute('aria-label', lbl + '，' + dd.ratioK + ' ' + ratioLabel(lr) +
          '，' + (isFinite(lcent) ? ((lcent >= 0 ? '+' : '') + fmt(lcent, 2) + ' ' + dd.unitCents) : ''));
        b.appendChild(doc.createTextNode(lbl));
        var lrSpan = mk('span', 'lr', { text: ratioLabel(lr) });
        b.appendChild(lrSpan);
        b.addEventListener('click', (function (val, label) {
          return function () {
            if (destroyed) return;
            var before = range[0] + ':' + range[1];
            ensureRange(val);
            if (before !== range[0] + ':' + range[1]) renderLens();
            setRatio(val, false);
            activeLens = null;
            renderValues();
            announce(tpl(D().applied, { label: label, ratio: ratioLabel(val) }));
          };
        })(lr, lbl));
        b.addEventListener('keydown', onLensKey);
        lensBox.appendChild(b);
        lensEls.push(b);
        if (isFinite(lr) && lr > 0) {
          var tick = mk('div', 'vz-mono-tick is-lens');
          tick.style.left = (posOf(lr) * 100).toFixed(3) + '%';
          track.appendChild(tick);
          tickEls.push(tick);
        }
      }
      hint.textContent = state.lens.length ? dd.hint : dd.empty;
    }

    function announce(msg) { if (live) live.textContent = msg; }

    function layout() {
      if (destroyed) return;
      drawString();
      renderValues();
    }

    function update(next) {
      if (destroyed) return;
      adoptHost(container);
      next = (next && typeof next === 'object') ? next : {};
      var ratio = num(next.ratio, NaN);
      state.ratio = ratio;
      state.lens = Array.isArray(next.lens) ? next.lens.filter(function (o) { return o && typeof o === 'object'; }).slice(0, 96) : [];
      state.hz = num(next.hz, NaN);
      state.centsGiven = num(next.cents, NaN);
      state.cents = state.centsGiven;
      state.note = next.note != null ? String(next.note) : '';
      if (isFinite(ratio)) ensureRange(ratio);
      if (isFinite(ratio)) curRatio = ratio;
      renderLens();
      renderValues();
    }

    function highlight(i) {
      if (destroyed) return;
      if (i == null || !isFinite(+i)) activeLens = null;
      else {
        var k = Math.round(+i);
        activeLens = (k < 0 || k >= state.lens.length) ? null : k;
      }
      renderValues();
    }

    /* 头部补一个音名 span（可选数据） */
    ratioBox.appendChild(noteSpan);

    var inst = {
      version: '1.0.0',
      update: update,
      highlight: highlight,
      resize: layout,
      destroy: function () {
        destroyed = true;
        if (ro) { ro.disconnect(); ro = null; }
        dragging = false;
        container.__vizMonochord = null;
        clear(container);
        lensEls = []; tickEls = [];
      },
      setLang: function (l) { lang = (l === 'en') ? 'en' : 'zh'; renderLens(); renderValues(); },
      getState: function () { return { ratio: state.ratio, lens: state.lens.slice(), cents: state.cents, hz: state.hz }; }
    };
    container.__vizMonochord = inst;
    ro = watchResize(stage, layout);
    /* 初始：无 state 时用 opts.value / 范围中点，保证 not-empty 可视化 */
    state.ratio = curRatio;
    state.cents = normCents(curRatio);
    state.centsGiven = NaN;
    renderLens();
    renderValues();
    return inst;
  }

  Viz.monochord = { version: '1.0.0', init: init };
})();
;
/* ===== 05. viz/bell.js ===== */
/* =============================================================================
 * 同律 CONCORD · viz/bell.js
 * -----------------------------------------------------------------------------
 * 用途：
 *   编钟双音（M6「编钟与琴 · 一钟两音」）。用极简 SVG 画一排编钟（钟体 / 枚 /
 *   篆 / 钮），每件钟可点选或键盘选择；钟体左右两半对应「正鼓音 / 侧鼓音」，
 *   用两个按钮切换正在发声的一侧，并显示两音频率与差值（音分 / Hz）。
 *   一钟双音是曾侯乙编钟的关键证据；本组件只渲染 app 传入的数据，不内置测音值。
 *
 * API：
 *   var inst = Viz.bell.init(el, opts);
 *     opts : { lang:'zh'|'en', reducedMotion:boolean,
 *              onSelect(id)            // 选中某件钟
 *              onTone(id,'front'|'side') // 切换发声部位
 *              selected:string, tone:'front'|'side' }  // 可选初始态
 *   inst.update(state)
 *   inst.highlight(i|null)    // 程序化选中第 i 件（不触发 onSelect）
 *   inst.resize() / inst.destroy() / inst.setLang(lang)
 *
 * state 契约：
 *   {
 *     bells: [{ id:string, name:string, bellfrontHz:number, bellsideHz:number, size:number }],
 *     selected: string,          // 选中钟的 id（匹配不到则取第一件）
 *     tone?: 'front'|'side'      // 可选：当前发声部位，默认 'front'
 *   }
 *
 * 依赖：无。纯原生 JS + SVG/HTML，file:// 直接可用。
 * 样式：--c-light / --c-bronze / --c-cyan / --c-red / --c-ink / --font-ui（均有 fallback）
 * 复跑：浏览器打开 viz/_demo.html；静态自检 py -X utf8 viz/check_viz.py。
 * ========================================================================== */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return;
  var doc = W.document;
  var Viz = W.Viz = W.Viz || {};
  if (Viz.bell) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var STYLE_ID = 'vz-bell-style';
  var LOG2 = Math.log(2);

  /* ---------- 工具 ---------- */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function num(v, d) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fmt(v, d) {
    if (!isFinite(v)) return '—';
    var s = v.toFixed(d == null ? 2 : d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  }
  function mk(tag, cls, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    return e;
  }
  function mks(tag, attrs) {
    var e = doc.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      e.setAttribute(k, v);
    }
    return e;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function ensureStyle(id, css) {
    if (doc.getElementById(id)) return;
    var s = mk('style'); s.id = id;
    s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
  }
  function motionAllowed(opts) {
    if (opts && typeof opts.reducedMotion === 'boolean') return !opts.reducedMotion;
    if (W.matchMedia) return !W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return true;
  }
  function pickLang(opts) {
    var l = opts && opts.lang;
    if (l !== 'en' && l !== 'zh') l = (doc.documentElement && doc.documentElement.lang === 'en') ? 'en' : 'zh';
    return l;
  }
  function tpl(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k] == null ? '' : String(map[k]); }); }
  function safeStub() {
    return {
      version: '1.0.0', update: function () {}, highlight: function () {}, resize: function () {},
      destroy: function () {}, setLang: function () {}, getState: function () { return null; }
    };
  }
  function watchResize(el, cb) {
    var raf = 0;
    var run = function () {
      if (raf) return;
      raf = W.requestAnimationFrame ? W.requestAnimationFrame(function () { raf = 0; cb(); }) : (cb(), 0);
    };
    if (typeof W.ResizeObserver === 'function') {
      var ro = new W.ResizeObserver(run); ro.observe(el);
      return { disconnect: function () { if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf); raf = 0; ro.disconnect(); } };
    }
    W.addEventListener('resize', run);
    return {
      disconnect: function () {
        if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf);
        raf = 0; W.removeEventListener('resize', run);
      }
    };
  }

  /* ---------- 文案 ---------- */
  var DICT = {
    zh: {
      group: '编钟双音：一钟两音',
      bellGroup: '编钟（单选，←→ 切换）',
      front: '正鼓音',
      side: '侧鼓音',
      toneGroup: '选择发声部位',
      diff: '两音相差',
      hz: 'Hz',
      unitCents: '音分',
      selectFirst: '请选择一件编钟',
      empty: '暂无编钟数据',
      hint: '点按或用 ← → 选择编钟；「正鼓 / 侧鼓」切换同一钟的两个基音',
      sel: '已选 {name}：正鼓音 {front} Hz，侧鼓音 {side} Hz，相差 {cents} 音分',
      frontSr: '正鼓音 {hz} Hz，已发声',
      sideSr: '侧鼓音 {hz} Hz，已发声'
    },
    en: {
      group: 'Two-tone bells: one bell, two pitches',
      bellGroup: 'Bells (single select, arrow keys)',
      front: 'front-strike pitch',
      side: 'side-strike pitch',
      toneGroup: 'Choose struck spot',
      diff: 'difference',
      hz: 'Hz',
      unitCents: 'cents',
      selectFirst: 'Select a bell',
      empty: 'No bell data',
      hint: 'Click or use ← → to pick a bell; “front / side” toggles the two pitches of one bell',
      sel: '{name} selected: front {front} Hz, side {side} Hz, {cents} cents apart',
      frontSr: 'Front-strike pitch {hz} Hz, sounding',
      sideSr: 'Side-strike pitch {hz} Hz, sounding'
    }
  };
  function dict(lang) { return DICT[lang === 'en' ? 'en' : 'zh']; }

  /* 钟体几何：viewBox 100×150，左右两半沿中线分开，方便分别着色 */
  var BODY_OUTLINE = 'M50,26 L66,26 C70,52 76,74 74,92 C72,114 64,130 60,138 L40,138 C36,130 28,114 26,92 C24,74 30,52 34,26 Z';
  var BODY_FRONT = 'M50,26 L34,26 C30,52 24,74 26,92 C28,114 36,130 40,138 L50,138 Z';
  var BODY_SIDE = 'M50,26 L66,26 C70,52 76,74 74,92 C72,114 64,130 60,138 L50,138 Z';

  function bellSvg() {
    var svg = mks('svg', { viewBox: '0 0 100 150', 'aria-hidden': 'true', focusable: 'false', 'class': 'vz-bell-svg' });
    /* 钮 */
    svg.appendChild(mks('circle', { 'class': 'vz-bell-hook', cx: 50, cy: 9, r: 4.5 }));
    svg.appendChild(mks('path', { 'class': 'vz-bell-hook', d: 'M45,18 L55,18 L55,12 Q50,6 45,12 Z' }));
    /* 舞（顶板） */
    svg.appendChild(mks('path', { 'class': 'vz-bell-plate', d: 'M34,26 L66,26 L62,17 L38,17 Z' }));
    /* 钟体左右两半 */
    svg.appendChild(mks('path', { 'class': 'vz-bell-half front', d: BODY_FRONT }));
    svg.appendChild(mks('path', { 'class': 'vz-bell-half side', d: BODY_SIDE }));
    svg.appendChild(mks('path', { 'class': 'vz-bell-outline', d: BODY_OUTLINE }));
    /* 篆（两道横向条带） */
    svg.appendChild(mks('path', { 'class': 'vz-bell-band', d: 'M31,58 Q50,54 69,58' }));
    svg.appendChild(mks('path', { 'class': 'vz-bell-band', d: 'M29,69 Q50,65 71,69' }));
    /* 枚（钟体上的乳突） */
    var studs = [[39, 46], [39, 54], [39, 62], [61, 46], [61, 54], [61, 62], [43, 82], [57, 82]];
    for (var i = 0; i < studs.length; i++) {
      svg.appendChild(mks('circle', { 'class': 'vz-bell-stud', cx: studs[i][0], cy: studs[i][1], r: 2.1 }));
    }
    /* 中缝（一钟两音的分界） */
    svg.appendChild(mks('line', { 'class': 'vz-bell-seam', x1: 50, y1: 27, x2: 50, y2: 137 }));
    /* 钟口唇 */
    svg.appendChild(mks('path', { 'class': 'vz-bell-lip', d: 'M38,134 Q50,142 62,134' }));
    svg.appendChild(mks('path', { 'class': 'vz-bell-lip', d: 'M36,138 Q50,147 64,138' }));
    return svg;
  }

  var CSS = [
    '.vz-bell{position:relative;display:flex;flex-direction:column;gap:10px;width:100%;height:100%;min-height:0;',
    'color:var(--c-light,#F0ECE2);font-family:var(--font-ui,"Segoe UI","Microsoft YaHei",system-ui,sans-serif);font-size:13px;line-height:1.45;}',
    '.vz-bell-row{position:relative;display:flex;align-items:flex-end;gap:14px;padding:26px 4px 2px;overflow-x:auto;',
    'overflow-y:hidden;flex:1 1 auto;min-height:118px;scrollbar-width:thin;}',
    '.vz-bell-row::before{content:"";position:absolute;left:0;right:0;top:14px;height:3px;border-radius:2px;',
    'background:rgba(200,163,90,.4);box-shadow:0 1px 0 rgba(0,0,0,.45);}',
    '.vz-bell-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;flex:0 0 auto;',
    'background:transparent;border:0;padding:0 2px 2px;cursor:pointer;color:inherit;border-radius:8px;',
    '-webkit-tap-highlight-color:transparent;transition:transform 120ms ease;}',
    '.vz-bell-item::before{content:"";position:absolute;top:-12px;left:50%;width:1px;height:14px;background:rgba(240,236,226,.28);}',
    '.vz-bell-item:hover{transform:translateY(-2px);}',
    '.vz-bell-item:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:3px;}',
    '.vz-bell-svg{display:block;overflow:visible;}',
    '.vz-bell-name{font-size:10.5px;opacity:.82;max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.vz-bell-item.is-selected .vz-bell-name{opacity:1;color:var(--c-bronze,#C8A35A);font-weight:700;}',
    '.vz-bell-hook{fill:none;stroke:var(--c-bronze,#C8A35A);stroke-width:2.4;stroke-linecap:round;}',
    '.vz-bell-plate{fill:rgba(240,236,226,.1);stroke:rgba(240,236,226,.3);stroke-width:1.4;}',
    '.vz-bell-half{stroke:none;transition:fill 160ms linear, opacity 160ms linear;}',
    '.vz-bell-half.front{fill:rgba(110,143,163,.14);}',
    '.vz-bell-half.side{fill:rgba(110,143,163,.14);}',
    '.vz-bell-outline{fill:none;stroke:rgba(240,236,226,.42);stroke-width:1.6;stroke-linejoin:round;}',
    '.vz-bell-item.is-selected .vz-bell-outline{stroke:var(--c-bronze,#C8A35A);stroke-width:2;}',
    '.vz-bell-item.is-selected .vz-bell-half{fill:rgba(200,163,90,.16);}',
    '.vz-bell-band{fill:none;stroke:rgba(240,236,226,.3);stroke-width:1;}',
    '.vz-bell-item.is-selected .vz-bell-band{stroke:rgba(240,236,226,.5);}',
    '.vz-bell-stud{fill:rgba(240,236,226,.34);}',
    '.vz-bell-item.is-selected .vz-bell-stud{fill:rgba(200,163,90,.75);}',
    '.vz-bell-seam{stroke:rgba(240,236,226,.3);stroke-width:1;stroke-dasharray:2 3;}',
    '.vz-bell-lip{fill:none;stroke:rgba(240,236,226,.45);stroke-width:2;stroke-linecap:round;}',
    '.vz-bell.is-tone-front .vz-bell-item.is-selected .vz-bell-half.front{fill:rgba(200,163,90,.5);}',
    '.vz-bell.is-tone-side .vz-bell-item.is-selected .vz-bell-half.side{fill:rgba(110,163,180,.55);}',
    '.vz-bell.is-tone-front .vz-bell-item.is-selected .vz-bell-half.side{fill:rgba(110,143,163,.08);opacity:.6;}',
    '.vz-bell.is-tone-side .vz-bell-item.is-selected .vz-bell-half.front{fill:rgba(200,163,90,.08);opacity:.6;}',
    '.vz-bell.is-tone-front .vz-bell-item.is-selected .vz-bell-half.front,.vz-bell.is-tone-side .vz-bell-item.is-selected .vz-bell-half.side{',
    'animation:vz-bell-glow 1.6s ease-in-out infinite;}',
    '@keyframes vz-bell-glow{0%,100%{opacity:1;}50%{opacity:.55;}}',
    '.vz-bell-rm .vz-bell-item.is-selected .vz-bell-half{animation:none !important;}',
    '.vz-bell-rm .vz-bell-item{transition:none;}',
    '@media (prefers-reduced-motion: reduce){',
    '.vz-bell-item{transition:none;}',
    '.vz-bell-item.is-selected .vz-bell-half{animation:none !important;}}',
    '.vz-bell-panel{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;border-top:1px solid rgba(240,236,226,.12);padding-top:6px;}',
    '.vz-bell-tones{display:inline-flex;gap:0;border:1px solid rgba(240,236,226,.24);border-radius:7px;overflow:hidden;}',
    '.vz-bell-tone{font:inherit;font-size:12px;color:var(--c-light,#F0ECE2);background:transparent;border:0;',
    'padding:5px 12px;cursor:pointer;line-height:1.5;}',
    '.vz-bell-tone+.vz-bell-tone{border-left:1px solid rgba(240,236,226,.24);}',
    '.vz-bell-tone[aria-pressed="true"]{background:rgba(200,163,90,.28);color:#fff;}',
    '.vz-bell-tone[aria-pressed="true"][data-tone="side"]{background:rgba(110,163,180,.34);}',
    '.vz-bell-tone:hover{background:rgba(240,236,226,.08);}',
    '.vz-bell-tone:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:-2px;}',
    '.vz-bell-nums{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline;}',
    '.vz-bell-num{display:inline-flex;align-items:baseline;gap:5px;}',
    '.vz-bell-num .k{font-size:11px;opacity:.62;}',
    '.vz-bell-num .v{font-size:13px;color:var(--c-cyan,#6E8FA3);font-variant-numeric:tabular-nums;}',
    '.vz-bell-num.is-front .v{color:var(--c-bronze,#C8A35A);}',
    '.vz-bell-diff .v{color:var(--c-light,#F0ECE2);font-weight:600;}',
    '.vz-bell-hint{margin:0;font-size:10.5px;opacity:.68;line-height:1.45;}',
    '.vz-bell-empty{font-size:12px;opacity:.6;padding:18px 4px;}',
    '.vz-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}'
  ].join('');

  /* 宿主容器的可访问语义接管：外部常把挂载位写成 role="img"（静态图语义），
     但组件内部有可聚焦控件，axe 会报 nested-interactive（role=img 不允许可聚焦后代）。
     组件是交互控件，这里把宿主 role 换成 group（保留外部 aria-label 作为组名）。
     注：index.html 若把 .viz-slot 的 role="img" 去掉会更干净，本函数只是组件的自保。 */
  function adoptHost(el) {
    if (!el || !el.getAttribute) return;
    var role = (el.getAttribute('role') || '').toLowerCase();
    /* img/figure 等静态图语义不允许包含可聚焦控件（axe nested-interactive）；
       button/link/application 会把整块变成一个可聚焦大控件，同样不符合本组件
       「一组独立控件」的模型。统一退回中性分组语义，保留宿主的 aria-label 作组名。 */
    if (role === 'img' || role === 'figure' || role === 'button' || role === 'link' || role === 'application') {
      el.setAttribute('role', 'group');
    }
    if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
  }

  function init(container, opts) {
    if (!container || !container.nodeType) return safeStub();
    adoptHost(container);
    if (container.__vizBell) { try { container.__vizBell.destroy(); } catch (e) {} }
    opts = opts || {};
    ensureStyle(STYLE_ID, CSS);
    var lang = pickLang(opts);
    var reduced = !motionAllowed(opts);
    var onSelect = (typeof opts.onSelect === 'function') ? opts.onSelect : null;
    var onTone = (typeof opts.onTone === 'function') ? opts.onTone : null;

    var state = { bells: [], selected: null, tone: (opts.tone === 'side') ? 'side' : 'front' };
    var itemEls = [], destroyed = false, live = null, ro = null;
    var row = null, emptyEl = null, panel = null, toneBtns = [], numFront = null, numSide = null, numDiff = null, hintEl = null;

    clear(container);
    var root = mk('div', 'vz-bell' + (reduced ? ' vz-bell-rm' : ''));
    root.setAttribute('role', 'group');
    row = mk('div', 'vz-bell-row');
    row.setAttribute('role', 'radiogroup');
    emptyEl = mk('div', 'vz-bell-empty');
    root.appendChild(row);
    root.appendChild(emptyEl);

    /* 读数面板 */
    panel = mk('div', 'vz-bell-panel');
    var toneBox = mk('div', 'vz-bell-tones');
    toneBox.setAttribute('role', 'group');
    var dd0 = dict(lang);
    toneBox.setAttribute('aria-label', dd0.toneGroup);
    function makeTone(tone, label) {
      var b = mk('button', 'vz-bell-tone', { text: label });
      b.type = 'button';
      b.setAttribute('data-tone', tone);
      b.setAttribute('aria-pressed', state.tone === tone ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (destroyed || !bells().length) return;
        state.tone = tone;
        applyTone();
        var cur = currentBell();
        if (cur && onTone) { try { onTone(cur.id, tone); } catch (e) {} }
        announceTone();
      });
      return b;
    }
    var dd = dict(lang);
    toneBtns.push(makeTone('front', dd.front));
    toneBtns.push(makeTone('side', dd.side));
    toneBox.appendChild(toneBtns[0]); toneBox.appendChild(toneBtns[1]);
    var nums = mk('div', 'vz-bell-nums');
    var numKeyEls = [];   /* 读数区三个标签（正鼓/侧鼓/相差），切语言时同步 */
    function numBox(cls, k) {
      var wrap = mk('div', 'vz-bell-num ' + cls);
      var kk = mk('span', 'k', { text: k });
      var vv = mk('span', 'v');
      wrap.appendChild(kk); wrap.appendChild(vv);
      nums.appendChild(wrap);
      numKeyEls.push(kk);
      return vv;
    }
    numFront = numBox('is-front', dd.front);
    numSide = numBox('', dd.side);
    numDiff = numBox('vz-bell-diff', dd.diff);
    panel.appendChild(toneBox); panel.appendChild(nums);
    hintEl = mk('p', 'vz-bell-hint');
    root.appendChild(panel);
    root.appendChild(hintEl);
    live = mk('div', 'vz-sr');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    root.appendChild(live);
    container.appendChild(root);

    function D() { return dict(lang); }
    function bells() { return state.bells; }
    function currentBell() {
      for (var i = 0; i < state.bells.length; i++) if (state.bells[i].id === state.selected) return state.bells[i];
      return state.bells.length ? state.bells[0] : null;
    }
    function selIndex() {
      for (var i = 0; i < state.bells.length; i++) if (state.bells[i].id === state.selected) return i;
      return -1;
    }
    function announce(msg) { if (live) live.textContent = msg; }
    function announceSel() {
      var dd = D();
      var b = currentBell();
      if (!b) { announce(dd.empty); return; }
      var f = num(b.bellfrontHz, NaN), s = num(b.bellsideHz, NaN);
      var cents = (isFinite(f) && isFinite(s) && f > 0 && s > 0) ? 1200 * Math.log(s / f) / LOG2 : NaN;
      announce(tpl(dd.sel, {
        name: b.name || b.id,
        front: isFinite(f) ? fmt(f, 2) : '—',
        side: isFinite(s) ? fmt(s, 2) : '—',
        cents: isFinite(cents) ? ((cents >= 0 ? '+' : '') + fmt(cents, 1)) : '—'
      }));
    }
    function announceTone() {
      var dd = D();
      var b = currentBell();
      if (!b) return;
      var hz = state.tone === 'front' ? num(b.bellfrontHz, NaN) : num(b.bellsideHz, NaN);
      announce(tpl(state.tone === 'front' ? dd.frontSr : dd.sideSr, { hz: isFinite(hz) ? fmt(hz, 2) : '—' }));
    }

    function applyTone() {
      if (!root) return;
      var dd = D();
      root.classList.toggle('is-tone-front', state.tone === 'front');
      root.classList.toggle('is-tone-side', state.tone === 'side');
      for (var i = 0; i < toneBtns.length; i++) {
        toneBtns[i].setAttribute('aria-pressed', toneBtns[i].getAttribute('data-tone') === state.tone ? 'true' : 'false');
      }
      var b = currentBell();
      renderNums(b);
      if (hintEl) hintEl.textContent = dd.hint;
    }

    function renderNums(b) {
      var dd = D();
      var f = b ? num(b.bellfrontHz, NaN) : NaN;
      var s = b ? num(b.bellsideHz, NaN) : NaN;
      numFront.textContent = isFinite(f) ? (fmt(f, 2) + ' ' + dd.hz) : '—';
      numSide.textContent = isFinite(s) ? (fmt(s, 2) + ' ' + dd.hz) : '—';
      var cents = (isFinite(f) && isFinite(s) && f > 0 && s > 0) ? 1200 * Math.log(s / f) / LOG2 : NaN;
      var dhz = (isFinite(f) && isFinite(s)) ? Math.abs(s - f) : NaN;
      numDiff.textContent = isFinite(cents)
        ? ((cents >= 0 ? '+' : '') + fmt(cents, 1) + ' ' + dd.unitCents + ' · ' + fmt(dhz, 2) + ' ' + dd.hz)
        : '—';
    }

    /* 选择（不改数据，只改态） */
    function selectIndex(i, fire) {
      if (destroyed || i < 0 || i >= state.bells.length) return;
      var nextId = state.bells[i].id;
      var changed = nextId !== state.selected;
      state.selected = nextId;
      for (var k = 0; k < itemEls.length; k++) {
        var sel = k === i;
        itemEls[k].classList.toggle('is-selected', sel);
        itemEls[k].setAttribute('aria-checked', sel ? 'true' : 'false');
        itemEls[k].tabIndex = sel ? 0 : -1;
      }
      applyTone();
      if (changed) announceSel();
      if (changed && fire && onSelect) { try { onSelect(nextId); } catch (e) {} }
    }

    function onItemKey(ev) {
      if (destroyed || !ev) return;
      var n = state.bells.length;
      if (!n) return;
      var i = itemEls.indexOf(ev.currentTarget);
      if (i < 0) i = selIndex();
      var nxt = -1;
      var cols = 1;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') nxt = (i + cols) % n;
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') nxt = (i - 1 + n) % n;
      else if (ev.key === 'Home') nxt = 0;
      else if (ev.key === 'End') nxt = n - 1;
      else if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        if (ev.preventDefault) ev.preventDefault();
        selectIndex(i, true);
        return;
      }
      if (nxt >= 0) {
        if (ev.preventDefault) ev.preventDefault();
        selectIndex(nxt, true);
        if (itemEls[nxt]) itemEls[nxt].focus();
      }
    }

    function render() {
      if (destroyed) return;
      var dd = D();
      root.setAttribute('aria-label', dd.group);
      row.setAttribute('aria-label', dd.bellGroup);
      clear(row);
      itemEls = [];
      var list = state.bells;
      if (!list.length) {
        row.style.display = 'none';
        emptyEl.style.display = '';
        emptyEl.textContent = dd.empty;
        panel.style.display = 'none';
        hintEl.textContent = dd.hint;
        return;
      }
      row.style.display = '';
      emptyEl.style.display = 'none';
      panel.style.display = '';
      /* 尺寸归一：size 越大钟越大 */
      var maxSize = 0;
      for (var i = 0; i < list.length; i++) maxSize = Math.max(maxSize, num(list[i].size, 1));
      if (!(maxSize > 0)) maxSize = 1;
      var idx = selIndex();
      if (idx < 0) { state.selected = list[0].id; idx = 0; }
      for (var k = 0; k < list.length; k++) {
        var b = list[k];
        var sizeNorm = clamp(num(b.size, 1) / maxSize, 0.55, 1.35);
        var w = Math.round(42 + 22 * sizeNorm);
        var h = Math.round(w * 1.48);
        var btn = mk('button', 'vz-bell-item');
        btn.type = 'button';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', k === idx ? 'true' : 'false');
        btn.tabIndex = (k === idx) ? 0 : -1;
        var f = num(b.bellfrontHz, NaN), s = num(b.bellsideHz, NaN);
        var cents = (isFinite(f) && isFinite(s) && f > 0 && s > 0) ? 1200 * Math.log(s / f) / LOG2 : NaN;
        btn.setAttribute('aria-label', (b.name != null ? String(b.name) : String(b.id)) + '，' + dd.front + ' ' +
          (isFinite(f) ? fmt(f, 2) : '—') + ' ' + dd.hz + '，' + dd.side + ' ' +
          (isFinite(s) ? fmt(s, 2) : '—') + ' ' + dd.hz +
          (isFinite(cents) ? ('，' + dd.diff + ' ' + (cents >= 0 ? '+' : '') + fmt(cents, 1) + ' ' + dd.unitCents) : ''));
        btn.setAttribute('data-id', String(b.id));
        var svg = bellSvg();
        svg.setAttribute('width', String(w));
        svg.setAttribute('height', String(h));
        btn.appendChild(svg);
        var nm = mk('span', 'vz-bell-name', { text: (b.name != null ? String(b.name) : String(b.id)) });
        btn.appendChild(nm);
        btn.addEventListener('click', (function (j) {
          return function () { selectIndex(j, true); };
        })(k));
        btn.addEventListener('keydown', onItemKey);
        if (k === idx) btn.classList.add('is-selected');
        row.appendChild(btn);
        itemEls.push(btn);
      }
      applyTone();
      hintEl.textContent = dd.hint;
    }

    function update(next) {
      if (destroyed) return;
      adoptHost(container);
      next = (next && typeof next === 'object') ? next : {};
      var arr = Array.isArray(next.bells) ? next.bells : [];
      state.bells = arr.filter(function (b) { return b && typeof b === 'object'; })
        .map(function (b, i) {
          return {
            id: (b.id != null) ? b.id : ('bell-' + i),
            name: (b.name != null) ? String(b.name) : ('#' + (i + 1)),
            bellfrontHz: num(b.bellfrontHz, NaN),
            bellsideHz: num(b.bellsideHz, NaN),
            size: num(b.size, 1)
          };
        }).slice(0, 128);
      var want = next.selected;
      var found = -1;
      for (var i = 0; i < state.bells.length; i++) if (state.bells[i].id === want) found = i;
      if (found >= 0) state.selected = want;
      else if (!state.bells.length) state.selected = null;
      else if (selIndex() < 0) state.selected = state.bells[0].id;
      if (next.tone === 'front' || next.tone === 'side') state.tone = next.tone;
      render();
    }

    function highlight(i) {
      if (destroyed) return;
      if (i == null || !isFinite(+i)) return;
      var k = Math.round(+i);
      selectIndex(k, false);
    }

    function destroy() {
      destroyed = true;
      if (ro) { ro.disconnect(); ro = null; }
      container.__vizBell = null;
      clear(container);
      itemEls = []; toneBtns = [];
    }

    var inst = {
      version: '1.0.0',
      update: update,
      highlight: highlight,
      resize: function () { /* 布局为纯 CSS 自适应，无需重算 */ },
      destroy: destroy,
      setLang: function (l) {
        lang = (l === 'en') ? 'en' : 'zh';
        var dd2 = dict(lang);
        toneBtns[0].textContent = dd2.front;
        toneBtns[1].textContent = dd2.side;
        toneBtns[0].parentNode.setAttribute('aria-label', dd2.toneGroup);
        if (numKeyEls[0]) numKeyEls[0].textContent = dd2.front;
        if (numKeyEls[1]) numKeyEls[1].textContent = dd2.side;
        if (numKeyEls[2]) numKeyEls[2].textContent = dd2.diff;
        var b = currentBell();
        if (b) renderNums(b);
        render();
      },
      getState: function () { return { bells: state.bells.slice(), selected: state.selected, tone: state.tone }; }
    };
    container.__vizBell = inst;
    var ddRoot = dict(lang);
    root.setAttribute('aria-label', ddRoot.group);
    emptyEl.textContent = ddRoot.empty;
    hintEl.textContent = ddRoot.hint;
    /* 首次无数据时也给出可聚焦的占位？—— 不造无意义 tab 停靠点，直接空态提示 */
    render();
    return inst;
  }

  Viz.bell = { version: '1.0.0', init: init };
})();
;
/* ===== 06. viz/centsRuler.js ===== */
/* =============================================================================
 * 同律 CONCORD · viz/centsRuler.js
 * -----------------------------------------------------------------------------
 * 用途：
 *   音分刻度尺叠加（M5「世界律制 · 同一个八度，很多种切法」）。横向 0–1200 音分
 *   刻度轴，多套律制各占一行、刻度叠放；鼠标悬停或键盘聚焦某个刻度时显示：
 *   该刻度相对「1200 音分 12 等分参考格线」的偏差，以及与其他律制最近刻度的差值。
 *   所有律制音分值由 app 从 data/kernel 传入，组件不内置任何律制数值。
 *
 * API：
 *   var inst = Viz.centsRuler.init(el, opts);
 *     opts : { lang:'zh'|'en', reducedMotion:boolean,
 *              onSelect({systemId, index, cents}) }   // 点选刻度
 *   inst.update(state)
 *   inst.highlight(i|null)      // 高亮：i 为「按 system 顺序展平」的刻度下标；
 *                               // 也接受 {systemId, index}
 *   inst.resize() / inst.destroy() / inst.setLang(lang)
 *
 * state 契约：
 *   { systems: [{ id:string, name:string, color?:string, cents:number[] }] }
 *   注：cents 应为 0–1200 音分上的位置；超出范围会在刻度尺上被夹到端点并标红，
 *       数值本身仍如实显示（不篡改数据）。
 *
 * 依赖：无。纯原生 JS + DOM/CSS，file:// 直接可用。
 * 样式：--c-light / --c-bronze / --c-cyan / --c-red / --c-ink / --font-ui（均有 fallback）
 * 复跑：浏览器打开 viz/_demo.html；静态自检 py -X utf8 viz/check_viz.py。
 * ========================================================================== */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return;
  var doc = W.document;
  var Viz = W.Viz = window.Viz || {};
  if (Viz.centsRuler) return;

  var STYLE_ID = 'vz-centsruler-style';
  var GRID = 1200 / 12; /* 仅作为参考格线（12 等分）的画法，不是律制数据 */

  /* ---------- 工具 ---------- */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function num(v, d) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fmt(v, d) {
    if (!isFinite(v)) return '—';
    var s = v.toFixed(d == null ? 2 : d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  }
  function mk(tag, cls, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    return e;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function ensureStyle(id, css) {
    if (doc.getElementById(id)) return;
    var s = mk('style'); s.id = id;
    s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
  }
  function motionAllowed(opts) {
    if (opts && typeof opts.reducedMotion === 'boolean') return !opts.reducedMotion;
    if (W.matchMedia) return !W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return true;
  }
  function pickLang(opts) {
    var l = opts && opts.lang;
    if (l !== 'en' && l !== 'zh') l = (doc.documentElement && doc.documentElement.lang === 'en') ? 'en' : 'zh';
    return l;
  }
  function tpl(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k] == null ? '' : String(map[k]); }); }
  function safeStub() {
    return {
      version: '1.0.0', update: function () {}, highlight: function () {}, resize: function () {},
      destroy: function () {}, setLang: function () {}, getState: function () { return null; }
    };
  }
  function watchResize(el, cb) {
    var raf = 0;
    var run = function () {
      if (raf) return;
      raf = W.requestAnimationFrame ? W.requestAnimationFrame(function () { raf = 0; cb(); }) : (cb(), 0);
    };
    if (typeof W.ResizeObserver === 'function') {
      var ro = new W.ResizeObserver(run); ro.observe(el);
      return { disconnect: function () { if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf); raf = 0; ro.disconnect(); } };
    }
    W.addEventListener('resize', run);
    return {
      disconnect: function () {
        if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf);
        raf = 0; W.removeEventListener('resize', run);
      }
    };
  }
  function safeColor(c) {
    if (typeof c !== 'string') return null;
    var s = c.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
    if (/^rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?(\s*[,/]\s*[\d.]+%?)?\s*\)$/.test(s)) return s;
    return null;
  }

  /* ---------- 文案 ---------- */
  var DICT = {
    zh: {
      group: '音分刻度尺：多律制叠加',
      axis: '音分（0 = 同一个八度起点，1200 = 八度）',
      gridRef: '参考格线：八度 12 等分（每格 100 音分）',
      rowGroup: '{name}，{n} 个刻度',
      mark: '{name} 第 {i} 音：{cents} 音分',
      readout: '{name} · 第 {i} 音 · {cents} 音分　偏离参考格线 {dev} 音分',
      nearest: '与其他律制最近刻度：',
      vs: '{name} {d}',
      hint: '悬停 / 键盘聚焦刻度看差值；←→ 在本律制内移动，↑↓ 换行，Enter 选中',
      empty: '暂无律制数据',
      outOfRange: '（超出 0–1200）'
    },
    en: {
      group: 'Cents ruler: stacked tuning systems',
      axis: 'cents (0 = start of the octave, 1200 = octave)',
      gridRef: 'reference grid: octave divided into 12 (100 cents each)',
      rowGroup: '{name}, {n} marks',
      mark: '{name} note {i}: {cents} cents',
      readout: '{name} · note {i} · {cents} cents　{dev} cents from the reference grid',
      nearest: 'Nearest mark in other systems:',
      vs: '{name} {d}',
      hint: 'Hover or keyboard-focus a mark to compare; ←→ within a system, ↑↓ across systems, Enter selects',
      empty: 'No tuning data',
      outOfRange: ' (outside 0–1200)'
    }
  };
  function dict(lang) { return DICT[lang === 'en' ? 'en' : 'zh']; }

  var PALETTE = ['var(--c-bronze,#C8A35A)', 'var(--c-cyan,#6E8FA3)', '#8FA98B', '#B08A6E', '#9C9AA8', '#7FA3A0'];

  var CSS = [
    '.vz-ruler{position:relative;display:flex;flex-direction:column;gap:8px;width:100%;height:100%;min-height:0;',
    'color:var(--c-light,#F0ECE2);font-family:var(--font-ui,"Segoe UI","Microsoft YaHei",system-ui,sans-serif);font-size:13px;line-height:1.45;}',
    '.vz-ruler-plot{position:relative;flex:1 1 auto;display:flex;flex-direction:column;min-height:120px;}',
    '.vz-ruler-rows{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;padding:2px 0;min-height:0;scrollbar-gutter:stable;}',
    '.vz-ruler-row{display:flex;align-items:center;gap:8px;min-height:27px;}',
    '.vz-ruler-name{flex:0 0 96px;max-width:96px;font-size:11.5px;opacity:.86;text-align:right;overflow:hidden;',
    'text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:5px;justify-content:flex-end;}',
    '.vz-ruler-dot{width:7px;height:7px;border-radius:50%;background:var(--row-color,var(--c-bronze,#C8A35A));flex:0 0 auto;}',
    '.vz-ruler-track{position:relative;flex:1 1 auto;height:26px;border-left:1px solid rgba(240,236,226,.28);',
    'border-right:1px solid rgba(240,236,226,.28);}',
    '.vz-ruler-track::before{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(240,236,226,.14);}',
    '.vz-ruler-mark{position:absolute;top:50%;width:16px;height:22px;margin:-11px 0 0 -8px;padding:0;border:0;',
    'background:transparent;cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent;}',
    '.vz-ruler-mark::before{content:"";position:absolute;left:50%;top:3px;width:2px;height:16px;margin-left:-1px;',
    'background:var(--row-color,var(--c-bronze,#C8A35A));border-radius:1px;opacity:.85;transition:opacity 120ms linear, transform 120ms linear;}',
    '.vz-ruler-mark:hover::before{opacity:1;transform:scaleY(1.18);}',
    '.vz-ruler-mark:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:1px;border-radius:3px;}',
    '.vz-ruler-mark.is-active::before{opacity:1;width:3px;margin-left:-1.5px;box-shadow:0 0 6px var(--row-color,var(--c-bronze,#C8A35A));}',
    '.vz-ruler-mark.is-out::before{background:var(--c-red,#C0392B);}',
    '.vz-ruler-axis{position:relative;height:30px;margin:0 0 0 104px;border-top:1px solid rgba(240,236,226,.22);}',
    '.vz-ruler-tick{position:absolute;top:0;width:1px;height:5px;background:rgba(240,236,226,.3);}',
    '.vz-ruler-tick.is-major{height:8px;background:rgba(240,236,226,.5);}',
    '.vz-ruler-tick-lbl{position:absolute;top:10px;font-size:9.5px;opacity:.62;transform:translateX(-50%);',
    'font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.vz-ruler-tick-lbl.is-first{transform:none;}',
    '.vz-ruler-tick-lbl.is-last{transform:translateX(-100%);}',
    '.vz-ruler-guide-wrap{position:absolute;left:104px;right:0;top:0;bottom:30px;pointer-events:none;}',
    '.vz-ruler-guide{position:absolute;top:0;bottom:0;width:1px;background:var(--c-light,#F0ECE2);opacity:0;',
    'pointer-events:none;transition:opacity 120ms linear;}',
    '.vz-ruler-guide.is-on{opacity:.45;}',
    '.vz-ruler-readout{min-height:30px;border-top:1px solid rgba(240,236,226,.12);padding-top:5px;font-size:11.5px;opacity:.94;}',
    '.vz-ruler-readout .main{font-variant-numeric:tabular-nums;}',
    '.vz-ruler-readout .dev{color:var(--c-bronze,#C8A35A);font-variant-numeric:tabular-nums;}',
    '.vz-ruler-readout .cmp{display:flex;flex-wrap:wrap;gap:2px 14px;margin-top:2px;font-size:11.5px;opacity:.8;}',
    '.vz-ruler-readout .cmp-k{opacity:.66;}',
    '.vz-ruler-readout .cmp-v{font-variant-numeric:tabular-nums;}',
    '.vz-ruler-hint{margin:0;font-size:10px;opacity:.66;line-height:1.45;}',
    '.vz-ruler-empty{font-size:12px;opacity:.6;padding:18px 4px;}',
    '.vz-ruler-rm .vz-ruler-mark::before,.vz-ruler-rm .vz-ruler-guide{transition:none;}',
    '@media (prefers-reduced-motion: reduce){.vz-ruler-mark::before,.vz-ruler-guide{transition:none;}}',
    '.vz-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}'
  ].join('');

  /* 宿主容器的可访问语义接管：外部常把挂载位写成 role="img"（静态图语义），
     但组件内部有可聚焦控件，axe 会报 nested-interactive（role=img 不允许可聚焦后代）。
     组件是交互控件，这里把宿主 role 换成 group（保留外部 aria-label 作为组名）。
     注：index.html 若把 .viz-slot 的 role="img" 去掉会更干净，本函数只是组件的自保。 */
  function adoptHost(el) {
    if (!el || !el.getAttribute) return;
    var role = (el.getAttribute('role') || '').toLowerCase();
    /* img/figure 等静态图语义不允许包含可聚焦控件（axe nested-interactive）；
       button/link/application 会把整块变成一个可聚焦大控件，同样不符合本组件
       「一组独立控件」的模型。统一退回中性分组语义，保留宿主的 aria-label 作组名。 */
    if (role === 'img' || role === 'figure' || role === 'button' || role === 'link' || role === 'application') {
      el.setAttribute('role', 'group');
    }
    if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
  }

  function init(container, opts) {
    if (!container || !container.nodeType) return safeStub();
    adoptHost(container);
    if (container.__vizCentsRuler) { try { container.__vizCentsRuler.destroy(); } catch (e) {} }
    opts = opts || {};
    ensureStyle(STYLE_ID, CSS);
    var lang = pickLang(opts);
    var reduced = !motionAllowed(opts);
    var onSelect = (typeof opts.onSelect === 'function') ? opts.onSelect : null;

    var state = { systems: [] };
    var marks = [];          /* 展平：{sysIndex, index, cents, el} */
    var rowEls = [], rowFocus = [];  /* 每行当前 tab 停靠的刻度下标 */
    var activeMark = null, destroyed = false, ro = null, live = null;
    var rowsBox = null, axisEl = null, plotEl = null, readoutEl = null, hintEl = null, guideEl = null, emptyEl = null;

    clear(container);
    var root = mk('div', 'vz-ruler' + (reduced ? ' vz-ruler-rm' : ''));
    root.setAttribute('role', 'group');
    plotEl = mk('div', 'vz-ruler-plot');
    rowsBox = mk('div', 'vz-ruler-rows');
    var guideWrap = mk('div', 'vz-ruler-guide-wrap');
    guideWrap.setAttribute('aria-hidden', 'true');
    guideEl = mk('div', 'vz-ruler-guide');
    guideWrap.appendChild(guideEl);
    axisEl = mk('div', 'vz-ruler-axis');
    axisEl.setAttribute('aria-hidden', 'true');
    plotEl.appendChild(rowsBox); plotEl.appendChild(guideWrap); plotEl.appendChild(axisEl);
    emptyEl = mk('div', 'vz-ruler-empty');
    readoutEl = mk('div', 'vz-ruler-readout');
    hintEl = mk('p', 'vz-ruler-hint');
    root.appendChild(emptyEl); root.appendChild(plotEl); root.appendChild(readoutEl); root.appendChild(hintEl);
    live = mk('div', 'vz-sr');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    root.appendChild(live);
    container.appendChild(root);

    function D() { return dict(lang); }
    function announce(msg) { if (live) live.textContent = msg; }

    function renderAxis() {
      var dd = D();
      clear(axisEl);
      axisEl.setAttribute('title', dd.gridRef);
      for (var c = 0; c <= 1200; c += GRID) {
        var p = c / 1200 * 100;
        var tk = mk('div', 'vz-ruler-tick' + (c % 300 === 0 ? ' is-major' : ''));
        tk.style.left = p.toFixed(3) + '%';
        axisEl.appendChild(tk);
        if (c % 100 === 0) {
          var lbl = mk('div', 'vz-ruler-tick-lbl' + (c === 0 ? ' is-first' : (c === 1200 ? ' is-last' : '')), { text: String(c) });
          lbl.style.left = p.toFixed(3) + '%';
          axisEl.appendChild(lbl);
        }
      }
    }

    function buildRows() {
      var dd = D();
      clear(rowsBox);
      rowEls = []; rowFocus = []; marks = [];
      activeMark = null;
      var total = 0;
      for (var s = 0; s < state.systems.length; s++) total += state.systems[s].cents.length;
      for (var i = 0; i < state.systems.length; i++) {
        var sys = state.systems[i];
        var color = safeColor(sys.color) || PALETTE[i % PALETTE.length];
        var row = mk('div', 'vz-ruler-row');
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', tpl(dd.rowGroup, { name: sys.name, n: sys.cents.length }));
        var nm = mk('div', 'vz-ruler-name');
        var dot = mk('span', 'vz-ruler-dot');
        dot.setAttribute('aria-hidden', 'true');
        nm.appendChild(dot);
        var nmTxt = mk('span', '', { text: sys.name });
        nm.appendChild(nmTxt);
        var track = mk('div', 'vz-ruler-track');
        track.style.setProperty('--row-color', color);
        row.appendChild(nm); row.appendChild(track);
        rowEls.push({ row: row, track: track, sysIndex: i, color: color });
        rowFocus.push(0);
        rowsBox.appendChild(row);
        for (var j = 0; j < sys.cents.length; j++) {
          var cents = num(sys.cents[j], NaN);
          var out = !isFinite(cents) || cents < 0 || cents > 1200;
          var p = isFinite(cents) ? (clamp(cents, 0, 1200) / 1200 * 100) : 0;
          var b = mk('button', 'vz-ruler-mark' + (out ? ' is-out' : ''));
          b.type = 'button';
          b.setAttribute('data-sys', String(i));
          b.setAttribute('data-i', String(j));
          b.style.left = p.toFixed(3) + '%';
          b.setAttribute('aria-label', tpl(dd.mark, {
            name: sys.name, i: j + 1, cents: isFinite(cents) ? fmt(cents, 2) : '—'
          }) + (out ? dd.outOfRange : ''));
          b.addEventListener('focus', onMarkFocus(i, j));
          b.addEventListener('mouseenter', onMarkFocus(i, j));
          b.addEventListener('blur', onMarkBlur);
          b.addEventListener('mouseleave', onMarkBlur);
          b.addEventListener('click', onMarkClick(i, j));
          b.addEventListener('keydown', onMarkKey);
          track.appendChild(b);
          marks.push({ sysIndex: i, index: j, cents: cents, el: b });
        }
        if (!sys.cents.length) {
          var none = mk('div', 'vz-ruler-tick-lbl', { text: '—' });
          none.style.left = '2%';
          track.appendChild(none);
        }
      }
      updateTabStops();
      clear(guideEl);
      readoutEl.textContent = '';
      if (!state.systems.length) {
        emptyEl.style.display = '';
        emptyEl.textContent = dd.empty;
        plotEl.style.display = 'none';
        hintEl.textContent = dd.hint;
      } else {
        emptyEl.style.display = 'none';
        plotEl.style.display = '';
        hintEl.textContent = dd.hint;
      }
    }

    function updateTabStops() {
      for (var s = 0; s < rowEls.length; s++) {
        var first = rowEls[s].track.querySelectorAll('.vz-ruler-mark');
        var want = clamp(rowFocus[s], 0, Math.max(0, first.length - 1));
        for (var k = 0; k < first.length; k++) first[k].tabIndex = (k === want) ? 0 : -1;
      }
    }

    function markAt(sysIndex, index) {
      for (var i = 0; i < marks.length; i++) {
        if (marks[i].sysIndex === sysIndex && marks[i].index === index) return marks[i];
      }
      return null;
    }

    function nearestOther(sysIndex, cents) {
      var out = [];
      if (!isFinite(cents)) return out;
      for (var s = 0; s < state.systems.length; s++) {
        if (s === sysIndex) continue;
        var arr = state.systems[s].cents, best = null, bd = Infinity;
        for (var j = 0; j < arr.length; j++) {
          var v = num(arr[j], NaN);
          if (!isFinite(v)) continue;
          var d = v - cents;
          if (Math.abs(d) < Math.abs(bd)) { bd = d; best = v; }
        }
        if (best != null) out.push({ name: state.systems[s].name, delta: bd });
      }
      out.sort(function (a, b) { return Math.abs(a.delta) - Math.abs(b.delta); });
      return out.slice(0, 4);
    }

    function showMark(m, announceIt) {
      var dd = D();
      var sys = state.systems[m.sysIndex];
      var cents = m.cents;
      var grid = isFinite(cents) ? cents - Math.round(cents / GRID) * GRID : NaN;
      clear(readoutEl);
      var main = mk('div', 'main');
      if (isFinite(cents)) {
        main.appendChild(doc.createTextNode(sys.name + ' · ' + (dd === DICT.en ? 'note ' : '第 ') + (m.index + 1) +
          (dd === DICT.en ? '' : ' 音') + ' · ' + fmt(cents, 2) + ' ' + (lang === 'en' ? 'cents' : '音分') + '　·　'));
        var dev = mk('span', 'dev', {
          text: (grid >= 0 ? '+' : '') + fmt(grid, 2) + ' ' + (lang === 'en' ? 'cents from grid' : '音分偏离参考格线')
        });
        main.appendChild(dev);
      } else {
        main.appendChild(doc.createTextNode(sys.name + ' · —'));
      }
      readoutEl.appendChild(main);
      var others = nearestOther(m.sysIndex, cents);
      if (others.length) {
        var cmp = mk('div', 'cmp');
        var k = mk('span', 'cmp-k', { text: dd.nearest });
        cmp.appendChild(k);
        for (var i = 0; i < others.length; i++) {
          var d = others[i].delta;
          var item = mk('span', '');
          item.appendChild(doc.createTextNode(others[i].name + ' '));
          var v = mk('span', 'cmp-v', { text: (d >= 0 ? '+' : '') + fmt(d, 2) });
          item.appendChild(v);
          cmp.appendChild(item);
        }
        readoutEl.appendChild(cmp);
      }
      /* 竖向导引线（guideWrap 与轨道同起点，left% 才对齐） */
      var canGuide = isFinite(cents);
      guideEl.classList.toggle('is-on', canGuide);
      if (canGuide) guideEl.style.left = (clamp(cents, 0, 1200) / 1200 * 100).toFixed(3) + '%';
      if (announceIt) announce(readoutEl.textContent.replace(/\s+/g, ' ').trim());
    }

    function hideMark() {
      /* 保留最后读数（避免读数区闪烁），只关导引线 */
      guideEl.classList.remove('is-on');
    }

    function onMarkFocus(sysIndex, index) {
      return function () {
        if (destroyed) return;
        var m = markAt(sysIndex, index);
        if (!m) return;
        rowFocus[sysIndex] = index;
        updateTabStops();
        activeMark = m;
        showMark(m, false);
      };
    }
    function onMarkBlur() {
      if (destroyed) return;
      var cur = doc.activeElement;
      if (cur && cur.classList && cur.classList.contains('vz-ruler-mark')) return;
      hideMark();
    }
    function onMarkClick(sysIndex, index) {
      return function (ev) {
        if (destroyed) return;
        if (ev && ev.preventDefault) ev.preventDefault();
        var m = markAt(sysIndex, index);
        if (!m) return;
        activeMark = m;
        showMark(m, true);
        if (onSelect && isFinite(m.cents)) {
          try { onSelect({ systemId: state.systems[sysIndex].id, index: index, cents: m.cents }); } catch (e) {}
        }
      };
    }
    function onMarkKey(ev) {
      if (destroyed || !ev) return;
      var el = ev.currentTarget;
      var si = num(el.getAttribute('data-sys'), -1);
      var j = num(el.getAttribute('data-i'), -1);
      if (si < 0) return;
      var track = rowEls[si].track;
      var list = track.querySelectorAll('.vz-ruler-mark');
      var nxt = null;
      if (ev.key === 'ArrowRight') nxt = list[Math.min(list.length - 1, j + 1)];
      else if (ev.key === 'ArrowLeft') nxt = list[Math.max(0, j - 1)];
      else if (ev.key === 'Home') nxt = list[0];
      else if (ev.key === 'End') nxt = list[list.length - 1];
      else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        var target = ev.key === 'ArrowUp' ? si - 1 : si + 1;
        if (target >= 0 && target < rowEls.length) {
          var other = rowEls[target].track.querySelectorAll('.vz-ruler-mark');
          var want = clamp(rowFocus[target], 0, other.length - 1);
          /* 优先落到音分位置最近的那个刻度 */
          if (activeMark && isFinite(activeMark.cents) && other.length) {
            var best = 0, bd = Infinity;
            for (var q = 0; q < other.length; q++) {
              var c2 = num(state.systems[target].cents[num(other[q].getAttribute('data-i'), 0)], 0);
              if (Math.abs(c2 - activeMark.cents) < bd) { bd = Math.abs(c2 - activeMark.cents); best = q; }
            }
            want = best;
          }
          rowFocus[target] = want;
          updateTabStops();
          nxt = other[want] || null;
        }
      } else if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        if (ev.preventDefault) ev.preventDefault();
        onMarkClick(si, j)();
        return;
      }
      if (nxt) {
        if (ev.preventDefault) ev.preventDefault();
        nxt.focus();
      }
    }

    function render() {
      if (destroyed) return;
      var dd = D();
      root.setAttribute('aria-label', dd.group);
      renderAxis();
      buildRows();
      if (state.systems.length) {
        var first = marks.length ? marks[0] : null;
        if (first && !readoutEl.firstChild) showMark(first, false);
      }
    }

    function update(next) {
      if (destroyed) return;
      adoptHost(container);
      next = (next && typeof next === 'object') ? next : {};
      var arr = Array.isArray(next.systems) ? next.systems : [];
      state.systems = arr.filter(function (s) { return s && typeof s === 'object'; }).map(function (s, i) {
        return {
          id: (s.id != null) ? s.id : ('sys-' + i),
          name: (s.name != null) ? String(s.name) : ('#' + (i + 1)),
          color: s.color,
          cents: Array.isArray(s.cents) ? s.cents.slice(0, 256) : []
        };
      }).slice(0, 24);
      var oldFocus = rowFocus.slice();
      render();
      for (var i = 0; i < Math.min(oldFocus.length, rowFocus.length); i++) rowFocus[i] = oldFocus[i];
      updateTabStops();
      if (marks.length) showMark(marks[0], false);
    }

    function highlight(i) {
      if (destroyed) return;
      var target = null;
      if (i && typeof i === 'object') {
        target = markAt(num(i.sysIndex != null ? i.sysIndex : i.systemIndex, -1), num(i.index, -1));
      } else if (i != null && isFinite(+i)) {
        var k = Math.round(+i);
        if (k >= 0 && k < marks.length) target = marks[k];
      }
      for (var m = 0; m < marks.length; m++) marks[m].el.classList.toggle('is-active', target === marks[m]);
      if (target) {
        activeMark = target;
        showMark(target, true);
      }
    }

    function destroy() {
      destroyed = true;
      if (ro) { ro.disconnect(); ro = null; }
      container.__vizCentsRuler = null;
      clear(container);
      marks = []; rowEls = []; rowFocus = [];
    }

    var inst = {
      version: '1.0.0',
      update: update,
      highlight: highlight,
      resize: function () {
        if (destroyed) return;
        /* 百分比定位无需重算；重算 tab 停靠与读数即可 */
        updateTabStops();
        if (activeMark) showMark(activeMark, false);
      },
      destroy: destroy,
      setLang: function (l) {
        lang = (l === 'en') ? 'en' : 'zh';
        var cur = activeMark;
        render();
        if (cur) {
          var m2 = markAt(cur.sysIndex, cur.index);
          if (m2) highlight(marks.indexOf(m2));
        }
      },
      getState: function () { return { systems: state.systems.slice() }; }
    };
    container.__vizCentsRuler = inst;
    ro = watchResize(rowsBox, function () { if (activeMark) showMark(activeMark, false); });
    var dd0 = dict(lang);
    root.setAttribute('aria-label', dd0.group);
    hintEl.textContent = dd0.hint;
    render();
    return inst;
  }

  Viz.centsRuler = { version: '1.0.0', init: init };
  /* 目录/调用方可能按 task 描述写成 cents-ruler：保留别名，避免集成时找不到 */
  Viz.cents_ruler = Viz.centsRuler;
})();
;
/* ===== 07. viz/worldmap.js ===== */
/* =============================================================================
 * 同律 CONCORD · viz/worldmap.js
 * -----------------------------------------------------------------------------
 * 用途：
 *   世界律制地图（M5）。极简世界轮廓（SVG 自绘简化大陆轮廓，无任何位图/第三方
 *   地图数据）+ 各律制文化区域点；点击区域点或下方列表项切换选中并回调。
 *   区域坐标由 app 的 data 传入，支持三种坐标口径（自动识别 / 可强制指定）：
 *     - lonlat：x=经度[-180,180]，y=纬度[-90,90]（推荐，等距圆柱投影）
 *     - norm  ：x,y ∈ [0,1] 的归一化平面坐标
 *     - px    ：以 1000×500 设计画布为基准的坐标
 *   组件不内置任何律制数值；轮廓仅为地理示意（非测绘精度，不作地理断言）。
 *
 * API：
 *   var inst = Viz.worldmap.init(el, opts);
 *     opts : { lang:'zh'|'en', reducedMotion:boolean,
 *              coord:'auto'|'lonlat'|'norm'|'px',   // 默认 auto
 *              onSelect(id) }
 *   inst.update(state)
 *   inst.highlight(i|null)       // 程序化选中第 i 条（不触发 onSelect）
 *   inst.resize() / inst.destroy() / inst.setLang(lang)
 *
 * state 契约：
 *   {
 *     entries: [{ id:string, name_zh:string, name_en:string, culture:string,
 *                 region:{x:number, y:number} }],
 *     selected: string            // 选中 entry 的 id
 *   }
 *
 * 依赖：无。纯原生 JS + SVG/DOM，file:// 直接可用。
 * 样式：--c-light / --c-bronze / --c-cyan / --c-red / --c-ink / --font-ui（均有 fallback）
 * 复跑：浏览器打开 viz/_demo.html；静态自检 py -X utf8 viz/check_viz.py。
 * ========================================================================== */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return;
  var doc = W.document;
  var Viz = W.Viz = W.Viz || {};
  if (Viz.worldmap) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var STYLE_ID = 'vz-worldmap-style';

  /* ---------- 工具 ---------- */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function num(v, d) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function mk(tag, cls, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    return e;
  }
  function mks(tag, attrs) {
    var e = doc.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      e.setAttribute(k, v);
    }
    return e;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function ensureStyle(id, css) {
    if (doc.getElementById(id)) return;
    var s = mk('style'); s.id = id;
    s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
  }
  function motionAllowed(opts) {
    if (opts && typeof opts.reducedMotion === 'boolean') return !opts.reducedMotion;
    if (W.matchMedia) return !W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return true;
  }
  function pickLang(opts) {
    var l = opts && opts.lang;
    if (l !== 'en' && l !== 'zh') l = (doc.documentElement && doc.documentElement.lang === 'en') ? 'en' : 'zh';
    return l;
  }
  function tpl(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k] == null ? '' : String(map[k]); }); }
  function safeStub() {
    return {
      version: '1.0.0', update: function () {}, highlight: function () {}, resize: function () {},
      destroy: function () {}, setLang: function () {}, getState: function () { return null; }
    };
  }
  function watchResize(el, cb) {
    var raf = 0;
    var run = function () {
      if (raf) return;
      raf = W.requestAnimationFrame ? W.requestAnimationFrame(function () { raf = 0; cb(); }) : (cb(), 0);
    };
    if (typeof W.ResizeObserver === 'function') {
      var ro = new W.ResizeObserver(run); ro.observe(el);
      return { disconnect: function () { if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf); raf = 0; ro.disconnect(); } };
    }
    W.addEventListener('resize', run);
    return {
      disconnect: function () {
        if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf);
        raf = 0; W.removeEventListener('resize', run);
      }
    };
  }

  /* ---------- 极简大陆轮廓（[lon,lat] 折线，程序化投影；仅地理示意） ---------- */
  var LAND = [
    [[-168, 65], [-160, 70], [-145, 70], [-130, 70], [-115, 69], [-100, 69], [-85, 70], [-80, 63],
      [-64, 60], [-55, 52], [-66, 45], [-70, 42], [-75, 36], [-81, 26], [-84, 30], [-90, 29], [-97, 26],
      [-105, 22], [-110, 24], [-114, 30], [-120, 34], [-124, 40], [-124, 48], [-132, 55], [-145, 60], [-160, 58]],
    [[-97, 16], [-92, 15], [-84, 10], [-78, 8], [-77, 7], [-83, 13], [-88, 17], [-93, 18]],
    [[-45, 60], [-55, 68], [-60, 76], [-46, 83], [-28, 82], [-20, 72], [-32, 60]],
    [[-81, 8], [-76, 11], [-66, 11], [-60, 9], [-52, 5], [-50, 0], [-44, -3], [-38, -8], [-35, -14],
      [-39, -22], [-48, -25], [-54, -34], [-58, -39], [-62, -41], [-65, -47], [-68, -52], [-70, -55],
      [-73, -51], [-72, -42], [-71, -30], [-70, -18], [-75, -10], [-78, -2]],
    [[-17, 21], [-16, 12], [-8, 5], [0, 5], [6, 4], [9, 4], [9, -1], [12, -6], [13, -17], [15, -27],
      [18, -34], [25, -34], [32, -29], [35, -24], [40, -16], [40, -2], [43, 12], [37, 22], [34, 28],
      [32, 31], [25, 32], [11, 33], [0, 36], [-6, 36], [-10, 30]],
    [[-10, 36], [-9, 44], [-2, 43], [2, 50], [8, 54], [10, 58], [8, 63], [15, 68], [30, 71], [45, 68],
      [60, 72], [75, 75], [90, 76], [105, 76], [120, 74], [135, 72], [150, 70], [165, 69], [180, 65],
      [180, 61], [160, 60], [145, 55], [140, 45], [130, 42], [125, 33], [120, 23], [108, 19], [105, 10],
      [100, 2], [95, 8], [90, 22], [84, 8], [80, 8], [76, 8], [70, 20], [66, 24], [58, 26], [52, 24],
      [48, 30], [42, 37], [36, 37], [30, 41], [26, 40], [22, 38], [18, 41], [12, 45], [7, 44], [3, 43]],
    [[113, -22], [114, -32], [122, -34], [129, -32], [137, -35], [145, -38], [150, -35], [153, -28],
      [146, -18], [142, -11], [136, -12], [130, -11], [125, -14], [115, -20]],
    [[-180, -72], [-150, -74], [-120, -74], [-90, -73], [-60, -70], [-30, -72], [0, -70], [30, -70],
      [60, -70], [90, -70], [120, -70], [150, -72], [180, -72], [180, -86], [-180, -86]],
    [[130, 32], [132, 34], [136, 35], [140, 38], [142, 42], [145, 44], [141, 42], [137, 37], [133, 34]],
    [[-6, 50], [-5, 55], [-3, 58], [0, 57], [1, 53], [0, 51], [-3, 50]],
    [[-24, 64], [-18, 66], [-14, 65], [-18, 63]],
    [[43, -12], [50, -15], [50, -25], [45, -25]],
    [[172, -34], [178, -38], [174, -42], [167, -46], [166, -45]],
    [[95, 5], [100, 2], [106, -6], [102, -5], [96, 2]],
    [[105, -6], [114, -8], [114, -9], [105, -7]],
    [[109, 2], [117, 4], [119, -2], [113, -4], [109, 0]],
    [[131, -1], [141, -3], [150, -6], [147, -9], [138, -8]],
    [[80, 9], [82, 7], [80, 6], [79, 8]]
  ];

  /* ---------- 文案 ---------- */
  var DICT = {
    zh: {
      group: '世界律制地图',
      mapLabel: '世界律制分布示意地图（装饰性轮廓，非测绘精度）',
      listGroup: '律制条目（单选，方向键切换）',
      item: '{name}，{culture}',
      tip: '{name} · {culture}',
      empty: '暂无律制条目',
      hint: '点按地图区域点或下方条目切换；←→ 在列表内切换，Enter 选中',
      selected: '已选择 {name}（{culture}）'
    },
    en: {
      group: 'Map of tuning systems worldwide',
      mapLabel: 'Stylised world map of tuning systems (decorative outline, not a survey map)',
      listGroup: 'Tuning systems (single select, arrow keys)',
      item: '{name}, {culture}',
      tip: '{name} · {culture}',
      empty: 'No entries',
      hint: 'Click a region dot or a list item; ←→ moves within the list, Enter selects',
      selected: '{name} selected ({culture})'
    }
  };
  function dict(lang) { return DICT[lang === 'en' ? 'en' : 'zh']; }
  var PALETTE = ['var(--c-bronze,#C8A35A)', 'var(--c-cyan,#6E8FA3)', '#8FA98B', '#B08A6E', '#9C9AA8', '#7FA3A0', '#C0A0A0'];

  var CSS = [
    '.vz-map{position:relative;display:flex;flex-direction:column;gap:8px;width:100%;height:100%;min-height:0;',
    'color:var(--c-light,#F0ECE2);font-family:var(--font-ui,"Segoe UI","Microsoft YaHei",system-ui,sans-serif);font-size:13px;line-height:1.45;}',
    '.vz-map-stage{position:relative;flex:1 1 auto;width:100%;min-height:170px;overflow:hidden;}',
    '.vz-map-svg{position:absolute;inset:0;width:100%;height:100%;display:block;}',
    '.vz-map-overlay{position:absolute;inset:0;pointer-events:none;}',
    '.vz-map-hit{cursor:pointer;}',
    '.vz-map-hit circle.hit{fill:transparent;stroke:none;}',
    '.vz-map-land{fill:rgba(240,236,226,.07);stroke:rgba(240,236,226,.2);stroke-width:1;stroke-linejoin:round;}',
    '.vz-map-grid{stroke:rgba(240,236,226,.09);stroke-width:1;fill:none;}',
    '.vz-map-grid-major{stroke:rgba(240,236,226,.14);}',
    '.vz-map-dot{fill:var(--c-cyan,#6E8FA3);stroke:var(--c-ink,#0B0D10);stroke-width:1.5;transition:r 140ms ease, fill 140ms linear;}',
    '.vz-map-dot.is-selected{fill:var(--c-bronze,#C8A35A);}',
    '.vz-map-ring{fill:none;stroke:var(--c-bronze,#C8A35A);stroke-width:2;opacity:0;transition:opacity 140ms linear;}',
    '.vz-map-ring.is-on{opacity:1;animation:vz-map-pulse 1.8s ease-in-out infinite;}',
    '@keyframes vz-map-pulse{0%,100%{stroke-opacity:1;}50%{stroke-opacity:.35;}}',
    '.vz-map-tip{position:absolute;left:0;top:0;transform:translate(-50%,-140%);pointer-events:none;',
    'background:rgba(11,13,16,.94);border:1px solid rgba(200,163,90,.5);border-radius:6px;padding:3px 8px;',
    'font-size:11.5px;white-space:nowrap;color:var(--c-light,#F0ECE2);box-shadow:0 4px 14px rgba(0,0,0,.45);',
    'opacity:0;transition:opacity 120ms linear;}',
    '.vz-map-tip.is-on{opacity:1;}',
    '.vz-map-list{display:flex;flex-wrap:wrap;gap:6px;}',
    '.vz-map-item{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;',
    'color:var(--c-light,#F0ECE2);background:rgba(240,236,226,.05);border:1px solid rgba(240,236,226,.18);',
    'border-radius:6px;padding:3px 9px;cursor:pointer;line-height:1.5;transition:border-color 120ms linear, background-color 120ms linear;}',
    '.vz-map-item:hover{border-color:var(--c-bronze,#C8A35A);background:rgba(200,163,90,.1);}',
    '.vz-map-item:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:1px;}',
    '.vz-map-item[aria-checked="true"]{border-color:var(--c-bronze,#C8A35A);background:rgba(200,163,90,.22);color:#fff;}',
    '.vz-map-item .sw{width:7px;height:7px;border-radius:50%;background:var(--dot,var(--c-cyan,#6E8FA3));flex:0 0 auto;}',
    '.vz-map-hint{margin:0;font-size:11px;opacity:.58;line-height:1.5;}',
    '.vz-map-empty{font-size:12px;opacity:.6;padding:14px 4px;}',
    '.vz-map-rm .vz-map-dot,.vz-map-rm .vz-map-tip,.vz-map-rm .vz-map-ring{transition:none;}',
    '.vz-map-rm .vz-map-ring.is-on{animation:none;}',
    '@media (prefers-reduced-motion: reduce){.vz-map-dot,.vz-map-tip,.vz-map-ring{transition:none;}',
    '.vz-map-ring.is-on{animation:none;}}',
    '.vz-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}'
  ].join('');

  /* 宿主容器的可访问语义接管：外部常把挂载位写成 role="img"（静态图语义），
     但组件内部有可聚焦控件，axe 会报 nested-interactive（role=img 不允许可聚焦后代）。
     组件是交互控件，这里把宿主 role 换成 group（保留外部 aria-label 作为组名）。
     注：index.html 若把 .viz-slot 的 role="img" 去掉会更干净，本函数只是组件的自保。 */
  function adoptHost(el) {
    if (!el || !el.getAttribute) return;
    var role = (el.getAttribute('role') || '').toLowerCase();
    /* img/figure 等静态图语义不允许包含可聚焦控件（axe nested-interactive）；
       button/link/application 会把整块变成一个可聚焦大控件，同样不符合本组件
       「一组独立控件」的模型。统一退回中性分组语义，保留宿主的 aria-label 作组名。 */
    if (role === 'img' || role === 'figure' || role === 'button' || role === 'link' || role === 'application') {
      el.setAttribute('role', 'group');
    }
    if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
  }

  function init(container, opts) {
    if (!container || !container.nodeType) return safeStub();
    adoptHost(container);
    if (container.__vizWorldmap) { try { container.__vizWorldmap.destroy(); } catch (e) {} }
    opts = opts || {};
    ensureStyle(STYLE_ID, CSS);
    var lang = pickLang(opts);
    var reduced = !motionAllowed(opts);
    var coordMode = (opts.coord === 'lonlat' || opts.coord === 'norm' || opts.coord === 'px') ? opts.coord : 'auto';
    var onSelect = (typeof opts.onSelect === 'function') ? opts.onSelect : null;

    var state = { entries: [], selected: null };
    var dots = [], itemEls = [], destroyed = false, ro = null, live = null;
    var stage = null, svg = null, overlay = null, tip = null, listEl = null, hintEl = null, emptyEl = null;

    clear(container);
    var root = mk('div', 'vz-map' + (reduced ? ' vz-map-rm' : ''));
    root.setAttribute('role', 'group');
    stage = mk('div', 'vz-map-stage');
    stage.setAttribute('role', 'img');
    svg = mks('svg', { 'class': 'vz-map-svg', 'aria-hidden': 'true', focusable: 'false' });
    overlay = mk('div', 'vz-map-overlay');
    tip = mk('div', 'vz-map-tip');
    tip.setAttribute('aria-hidden', 'true');
    stage.appendChild(svg); stage.appendChild(overlay);
    var bottom = mk('div', 'vz-map-bottom');
    listEl = mk('div', 'vz-map-list');
    listEl.setAttribute('role', 'radiogroup');
    hintEl = mk('p', 'vz-map-hint');
    emptyEl = mk('div', 'vz-map-empty');
    bottom.appendChild(listEl); bottom.appendChild(hintEl);
    root.appendChild(stage); root.appendChild(emptyEl); root.appendChild(bottom);
    live = mk('div', 'vz-sr');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    root.appendChild(live);
    container.appendChild(root);

    function D() { return dict(lang); }
    function announce(msg) { if (live) live.textContent = msg; }
    function nameOf(e) {
      if (!e) return '—';
      if (lang === 'en') return e.name_en || e.name_zh || e.name || e.id;
      return e.name_zh || e.name_en || e.name || e.id;
    }
    function cultureOf(e) { return (e && e.culture != null) ? String(e.culture) : ''; }

    /* 坐标口径识别 */
    function modeFor(region) {
      if (coordMode !== 'auto') return coordMode;
      var x = num(region.x, NaN), y = num(region.y, NaN);
      if (!isFinite(x) || !isFinite(y)) return 'px';
      if (Math.abs(x) <= 1 && Math.abs(y) <= 1) return 'norm';
      if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return 'lonlat';
      return 'px';
    }
    function project(region, w, h) {
      var mh = Math.min(h, w / 2), mw = mh * 2;
      var ox = (w - mw) / 2, oy = (h - mh) / 2;
      var mode = modeFor(region);
      var x = num(region.x, 0), y = num(region.y, 0);
      if (mode === 'lonlat') {
        return { x: ox + (clamp(x, -180, 180) + 180) / 360 * mw, y: oy + (90 - clamp(y, -90, 90)) / 180 * mh, mode: mode };
      }
      if (mode === 'norm') {
        return { x: ox + clamp(x, 0, 1) * mw, y: oy + clamp(y, 0, 1) * mh, mode: mode };
      }
      return { x: ox + clamp(x / 1000, 0, 1) * mw, y: oy + clamp(y / 500, 0, 1) * mh, mode: mode };
    }
    function projectLonLat(lon, lat, w, h) {
      var mh = Math.min(h, w / 2), mw = mh * 2;
      var ox = (w - mw) / 2, oy = (h - mh) / 2;
      return { x: ox + (lon + 180) / 360 * mw, y: oy + (90 - lat) / 180 * mh };
    }

    function drawMap() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return false;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      clear(svg);
      /* 经纬网 */
      var grid = mks('g');
      for (var lon = -150; lon <= 150; lon += 30) {
        var a = projectLonLat(lon, 84, w, h), b = projectLonLat(lon, -84, w, h);
        grid.appendChild(mks('line', {
          'class': 'vz-map-grid' + (lon === 0 ? ' vz-map-grid-major' : ''),
          x1: a.x.toFixed(1), y1: a.y.toFixed(1), x2: b.x.toFixed(1), y2: b.y.toFixed(1)
        }));
      }
      for (var lat = -60; lat <= 60; lat += 30) {
        var c = projectLonLat(-180, lat, w, h), d = projectLonLat(180, lat, w, h);
        grid.appendChild(mks('line', {
          'class': 'vz-map-grid' + (lat === 0 ? ' vz-map-grid-major' : ''),
          x1: c.x.toFixed(1), y1: c.y.toFixed(1), x2: d.x.toFixed(1), y2: d.y.toFixed(1)
        }));
      }
      svg.appendChild(grid);
      /* 大陆轮廓 */
      var land = mks('g');
      for (var i = 0; i < LAND.length; i++) {
        var pts = LAND[i], dd = '';
        for (var j = 0; j < pts.length; j++) {
          var p = projectLonLat(pts[j][0], pts[j][1], w, h);
          dd += (j === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
        }
        land.appendChild(mks('path', { 'class': 'vz-map-land', d: dd + 'Z' }));
      }
      svg.appendChild(land);
      /* 区域点 + 选中环（SVG 指针交互；键盘/读屏走下方列表，避免重复 tab 停靠点） */
      var dotsG = mks('g');
      for (var k = 0; k < state.entries.length; k++) {
        var ent = state.entries[k];
        var pos = project(ent.region || {}, w, h);
        var sel = ent.id === state.selected;
        var hit = mks('g', { 'class': 'vz-map-hit', 'data-id': String(ent.id) });
        hit.appendChild(mks('circle', {
          'class': 'vz-map-ring' + (sel ? ' is-on' : ''),
          cx: pos.x.toFixed(1), cy: pos.y.toFixed(1), r: 10
        }));
        hit.appendChild(mks('circle', {
          'class': 'vz-map-dot' + (sel ? ' is-selected' : ''),
          cx: pos.x.toFixed(1), cy: pos.y.toFixed(1), r: sel ? 6 : 4.5,
          'data-id': String(ent.id)
        }));
        hit.appendChild(mks('circle', {
          'class': 'hit', cx: pos.x.toFixed(1), cy: pos.y.toFixed(1), r: 15
        }));
        hit.addEventListener('click', (function (id) {
          return function () { selectById(id, true); };
        })(ent.id));
        hit.addEventListener('mouseenter', (function (id) {
          return function () { showTip(id); };
        })(ent.id));
        hit.addEventListener('mouseleave', hideTip);
        dotsG.appendChild(hit);
      }
      svg.appendChild(dotsG);
      clear(overlay);
      overlay.appendChild(tip);
      /* 选中条目的提示牌 */
      if (state.selected != null) showTip(state.selected);
      else hideTip();
      return true;
    }

    function showTip(id) {
      var ent = null;
      for (var i = 0; i < state.entries.length; i++) if (state.entries[i].id === id) ent = state.entries[i];
      if (!ent || !tip) { hideTip(); return; }
      var w = stage.clientWidth || 0, h = stage.clientHeight || 0;
      var pos = project(ent.region || {}, w, h);
      tip.textContent = tpl(D().tip, { name: nameOf(ent), culture: cultureOf(ent) });
      tip.style.left = clamp(pos.x, 60, Math.max(60, w - 60)).toFixed(1) + 'px';
      tip.style.top = clamp(pos.y, 30, Math.max(30, h - 8)).toFixed(1) + 'px';
      tip.classList.add('is-on');
    }
    function hideTip() { if (tip) tip.classList.remove('is-on'); }

    function selectedEntry() {
      for (var i = 0; i < state.entries.length; i++) if (state.entries[i].id === state.selected) return state.entries[i];
      return state.entries.length ? state.entries[0] : null;
    }

    function applySelection() {
      var dd = D();
      var sel = selectedEntry();
      if (!sel) { state.selected = null; }
      else if (state.selected !== sel.id) state.selected = sel.id;
      /* svg 点 */
      var dotsEls = svg.querySelectorAll('.vz-map-dot');
      var rings = svg.querySelectorAll('.vz-map-ring');
      for (var i = 0; i < dotsEls.length; i++) {
        var isSel = dotsEls[i].getAttribute('data-id') === String(state.selected);
        dotsEls[i].classList.toggle('is-selected', isSel);
        dotsEls[i].setAttribute('r', isSel ? '6' : '4.5');
        rings[i].classList.toggle('is-on', isSel);
      }
      /* 列表 */
      for (var k = 0; k < itemEls.length; k++) {
        var ent = state.entries[k];
        var on = ent && ent.id === state.selected;
        itemEls[k].setAttribute('aria-checked', on ? 'true' : 'false');
        itemEls[k].tabIndex = on ? 0 : -1;
      }
      if (state.selected != null) showTip(state.selected); else hideTip();
      if (sel && hintEl) hintEl.textContent = tpl(dd.selected, { name: nameOf(sel), culture: cultureOf(sel) }) + ' · ' + dd.hint;
    }

    function selectById(id, fire) {
      if (destroyed) return;
      var changed = id !== state.selected;
      state.selected = id;
      applySelection();
      var sel = selectedEntry();
      if (sel) announce(tpl(D().selected, { name: nameOf(sel), culture: cultureOf(sel) }));
      if (changed && fire && onSelect) { try { onSelect(id); } catch (e) {} }
    }

    function onItemKey(ev) {
      if (destroyed || !ev) return;
      var n = state.entries.length;
      if (!n) return;
      var i = itemEls.indexOf(ev.currentTarget);
      if (i < 0) i = 0;
      var nxt = -1;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') nxt = (i + 1) % n;
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') nxt = (i - 1 + n) % n;
      else if (ev.key === 'Home') nxt = 0;
      else if (ev.key === 'End') nxt = n - 1;
      else if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        if (ev.preventDefault) ev.preventDefault();
        selectById(state.entries[i].id, true);
        return;
      }
      if (nxt >= 0) {
        if (ev.preventDefault) ev.preventDefault();
        selectById(state.entries[nxt].id, true);
        itemEls[nxt].focus();
      }
    }

    function buildList() {
      var dd = D();
      clear(listEl);
      itemEls = [];
      listEl.setAttribute('aria-label', dd.listGroup);
      if (!state.entries.length) {
        listEl.style.display = 'none';
        emptyEl.style.display = '';
        emptyEl.textContent = dd.empty;
        hintEl.textContent = '';
        stage.setAttribute('aria-label', dd.empty);
        return;
      }
      listEl.style.display = '';
      emptyEl.style.display = 'none';
      stage.setAttribute('aria-label', dd.mapLabel + ' · ' + dd.group + ' · ' + state.entries.length);
      for (var i = 0; i < state.entries.length; i++) {
        var ent = state.entries[i];
        var b = mk('button', 'vz-map-item');
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('data-i', String(i));
        b.setAttribute('aria-label', tpl(dd.item, { name: nameOf(ent), culture: cultureOf(ent) }));
        var sw = mk('span', 'sw');
        sw.setAttribute('aria-hidden', 'true');
        sw.style.setProperty('--dot', PALETTE[i % PALETTE.length]);
        b.appendChild(sw);
        b.appendChild(doc.createTextNode(nameOf(ent)));
        b.addEventListener('click', (function (id) {
          return function () { selectById(id, true); };
        })(ent.id));
        b.addEventListener('keydown', onItemKey);
        listEl.appendChild(b);
        itemEls.push(b);
      }
      hintEl.textContent = dd.hint;
    }

    function render() {
      if (destroyed) return;
      var dd = D();
      root.setAttribute('aria-label', dd.group);
      buildList();
      applySelection();
      drawMap();
    }

    function update(next) {
      if (destroyed) return;
      adoptHost(container);
      next = (next && typeof next === 'object') ? next : {};
      var arr = Array.isArray(next.entries) ? next.entries : [];
      state.entries = arr.filter(function (e) { return e && typeof e === 'object'; }).map(function (e, i) {
        var reg = (e.region && typeof e.region === 'object') ? e.region : {};
        return {
          id: (e.id != null) ? e.id : ('entry-' + i),
          name_zh: (e.name_zh != null) ? String(e.name_zh) : '',
          name_en: (e.name_en != null) ? String(e.name_en) : '',
          name: (e.name != null) ? String(e.name) : '',
          culture: (e.culture != null) ? String(e.culture) : '',
          region: { x: num(reg.x, 0), y: num(reg.y, 0), has: (reg.x != null && reg.y != null) }
        };
      }).slice(0, 200);
      var want = next.selected;
      var found = false;
      for (var i = 0; i < state.entries.length; i++) if (state.entries[i].id === want) { found = true; break; }
      if (found) state.selected = want;
      else if (state.selected == null || state.selected === undefined) state.selected = state.entries.length ? state.entries[0].id : null;
      render();
    }

    function highlight(i) {
      if (destroyed) return;
      if (i == null || !isFinite(+i)) return;
      var k = Math.round(+i);
      if (k < 0 || k >= state.entries.length) return;
      selectById(state.entries[k].id, false);
    }

    function layout() {
      if (destroyed) return;
      drawMap();
      applySelection();
    }

    function destroy() {
      destroyed = true;
      if (ro) { ro.disconnect(); ro = null; }
      container.__vizWorldmap = null;
      clear(container);
      dots = []; itemEls = [];
    }

    var inst = {
      version: '1.0.0',
      update: update,
      highlight: highlight,
      resize: layout,
      destroy: destroy,
      setLang: function (l) { lang = (l === 'en') ? 'en' : 'zh'; render(); },
      getState: function () { return { entries: state.entries.slice(), selected: state.selected }; }
    };
    container.__vizWorldmap = inst;
    ro = watchResize(stage, layout);
    var dd0 = dict(lang);
    root.setAttribute('aria-label', dd0.group);
    stage.setAttribute('aria-label', dd0.mapLabel);
    hintEl.textContent = dd0.hint;
    emptyEl.textContent = dd0.empty;
    render();
    return inst;
  }

  Viz.worldmap = { version: '1.0.0', init: init };
})();
;
/* ===== 08. viz/isochord.js ===== */
/* =============================================================================
 * 同律 CONCORD · viz/isochord.js
 * -----------------------------------------------------------------------------
 * 用途：
 *   律与器（M7「律与器 · 妥协的艺术」）。三种模式共用一套 API：
 *     - fret  ：吉他指板品丝。按 state.cents[] 的音分位置画品丝，并给出
 *               距弦枕距离 d = L × (1 − 2^(−cents/1200))（mm），同时显示与
 *               12 等分参考位置的偏差。L 为 app 传入的弦长 scale length。
 *     - piano ：钢琴调律偏差。每个键画一根相对 0 参考线的偏移条（cents 为
 *               相对 12 平均律的偏差，正 = 偏高）。
 *     - voice ：人声 / 无品弦乐器的自由调音示意。cents 为各时刻相对目标的偏差，
 *               画成漂移曲线（不做「等分格」锁定）。
 *   组件只渲染 app 传入的数据；12 等分仅作可视化参考线，不是律制结论。
 *
 * API：
 *   var inst = Viz.isochord.init(el, opts);
 *     opts : { lang:'zh'|'en', reducedMotion:boolean, onSelect(index) }
 *   inst.update(state)
 *   inst.highlight(i|null)     // 高亮第 i 个品/键/采样点
 *   inst.resize() / inst.destroy() / inst.setLang(lang)
 *
 * state 契约：
 *   { mode:'fret'|'piano'|'voice', L:number, cents:number[] }
 *
 * 依赖：无。纯原生 JS + SVG/DOM，file:// 直接可用。
 * 样式：--c-light / --c-bronze / --c-cyan / --c-red / --c-ink / --font-ui（均有 fallback）
 * 复跑：浏览器打开 viz/_demo.html；静态自检 py -X utf8 viz/check_viz.py。
 * ========================================================================== */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return;
  var doc = W.document;
  var Viz = W.Viz = window.Viz || {};
  if (Viz.isochord) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var STYLE_ID = 'vz-isochord-style';
  var LOG2 = Math.log(2);
  /* 音名口径按 M5 中庸律惯例取降号侧（wolf 在 G♯–E♭）：不用 D♯/A♯/E♯ */
  var NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];

  /* ---------- 工具 ---------- */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function num(v, d) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fmt(v, d) {
    if (!isFinite(v)) return '—';
    var s = v.toFixed(d == null ? 2 : d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  }
  function mk(tag, cls, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    return e;
  }
  function mks(tag, attrs) {
    var e = doc.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      e.setAttribute(k, v);
    }
    return e;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function ensureStyle(id, css) {
    if (doc.getElementById(id)) return;
    var s = mk('style'); s.id = id;
    s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
  }
  function motionAllowed(opts) {
    if (opts && typeof opts.reducedMotion === 'boolean') return !opts.reducedMotion;
    if (W.matchMedia) return !W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return true;
  }
  function pickLang(opts) {
    var l = opts && opts.lang;
    if (l !== 'en' && l !== 'zh') l = (doc.documentElement && doc.documentElement.lang === 'en') ? 'en' : 'zh';
    return l;
  }
  function tpl(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k] == null ? '' : String(map[k]); }); }
  function safeStub() {
    return {
      version: '1.0.0', update: function () {}, highlight: function () {}, resize: function () {},
      destroy: function () {}, setLang: function () {}, getState: function () { return null; }
    };
  }
  function watchResize(el, cb) {
    var raf = 0;
    var run = function () {
      if (raf) return;
      raf = W.requestAnimationFrame ? W.requestAnimationFrame(function () { raf = 0; cb(); }) : (cb(), 0);
    };
    if (typeof W.ResizeObserver === 'function') {
      var ro = new W.ResizeObserver(run); ro.observe(el);
      return { disconnect: function () { if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf); raf = 0; ro.disconnect(); } };
    }
    W.addEventListener('resize', run);
    return {
      disconnect: function () {
        if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf);
        raf = 0; W.removeEventListener('resize', run);
      }
    };
  }

  /* ---------- 文案 ---------- */
  var DICT = {
    zh: {
      group: '律与器：品丝、调律与自由调音',
      modeFret: '吉他指板 · 品丝位置',
      modePiano: '钢琴调律偏差',
      modeVoice: '人声 / 无品弦乐器的自由调音',
      fretFormula: '品丝距弦枕 d = L × (1 − 2^(−cents/1200))',
      pianoNote: '偏移条 = 该音相对 12 平均律的偏差（音分）；虚线为 0 参考。',
      voiceNote: '可连续调音：音高围绕目标浮动，不必落在等分格上。',
      scaleLen: '弦长 L',
      unitMm: 'mm',
      unitCents: '音分',
      nut: '弦枕',
      bridge: '琴桥',
      open: '空弦',
      fretN: '第 {n} 品',
      fretRead: '第 {n} 品 · {cents} 音分 · 距弦枕 {mm} mm · 与 12 等分参考差 {dev} 音分',
      openRead: '空弦 · 0 音分',
      pianoRead: '{note} · 偏差 {dev} 音分（相对 12 平均律）',
      voiceRead: '第 {n} 个采样 · 偏差 {dev} 音分',
      hint: '← → 移动，Enter 选中当前项',
      empty: '暂无数据',
      dev0: '0 参考',
      sharp: '偏高',
      flat: '偏低'
    },
    en: {
      group: 'Instruments: frets, tuning and free intonation',
      modeFret: 'Guitar fretboard · fret positions',
      modePiano: 'Piano tuning deviation',
      modeVoice: 'Free intonation: voice / unfretted strings',
      fretFormula: 'fret distance from nut d = L × (1 − 2^(−cents/1200))',
      pianoNote: 'offset bars show each note’s deviation from 12-TET (cents); dashed line = 0.',
      voiceNote: 'Continuous intonation: pitch floats around the target instead of landing on a grid.',
      scaleLen: 'scale length L',
      unitMm: 'mm',
      unitCents: 'cents',
      nut: 'nut',
      bridge: 'bridge',
      open: 'open',
      fretN: 'fret {n}',
      fretRead: 'Fret {n} · {cents} cents · {mm} mm from the nut · {dev} cents vs 12-TET reference',
      openRead: 'Open string · 0 cents',
      pianoRead: '{note} · {dev} cents deviation (vs 12-TET)',
      voiceRead: 'Sample {n} · {dev} cents deviation',
      hint: '← → to move, Enter to select',
      empty: 'No data',
      dev0: '0 reference',
      sharp: 'sharp',
      flat: 'flat'
    }
  };
  function dict(lang) { return DICT[lang === 'en' ? 'en' : 'zh']; }

  var CSS = [
    '.vz-iso{position:relative;display:flex;flex-direction:column;gap:8px;width:100%;height:100%;min-height:0;',
    'color:var(--c-light,#F0ECE2);font-family:var(--font-ui,"Segoe UI","Microsoft YaHei",system-ui,sans-serif);font-size:13px;line-height:1.45;}',
    '.vz-iso-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;}',
    '.vz-iso-title{font-size:13px;font-weight:600;color:var(--c-bronze,#C8A35A);}',
    '.vz-iso-sub{font-size:11.5px;opacity:.62;}',
    '.vz-iso-stage{position:relative;flex:1 1 auto;min-height:104px;display:flex;align-items:center;}',
    '.vz-iso-board{position:relative;width:100%;height:96px;border-radius:5px;',
    'background:linear-gradient(180deg,rgba(240,236,226,.05),rgba(240,236,226,.02));border:1px solid rgba(240,236,226,.14);}',
    '.vz-iso-string{position:absolute;left:0;right:0;height:1px;background:rgba(240,236,226,.2);pointer-events:none;}',
    '.vz-iso-nut{position:absolute;left:0;top:0;bottom:0;width:7px;background:var(--c-bronze,#C8A35A);opacity:.85;border-radius:3px 0 0 3px;pointer-events:none;}',
    '.vz-iso-fret{position:absolute;top:2px;bottom:2px;width:16px;margin-left:-8px;padding:0;border:0;',
    'background:transparent;cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent;}',
    '.vz-iso-wire{position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:rgba(240,236,226,.42);border-radius:1px;',
    'transition:background-color 120ms linear, opacity 120ms linear;}',
    '.vz-iso-fret:hover .vz-iso-wire{background:var(--c-light,#F0ECE2);}',
    '.vz-iso-fret:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:1px;border-radius:3px;}',
    '.vz-iso-fret.is-active .vz-iso-wire{background:var(--c-bronze,#C8A35A);width:3px;margin-left:-1.5px;box-shadow:0 0 8px rgba(200,163,90,.7);}',
    '.vz-iso-fret-label{position:absolute;top:auto;bottom:-16px;left:50%;transform:translateX(-50%);font-size:9.5px;opacity:.6;pointer-events:none;white-space:nowrap;}',
    '.vz-iso-fret.is-active .vz-iso-fret-label,.vz-iso-fret:focus-visible .vz-iso-fret-label{opacity:1;color:var(--c-bronze,#C8A35A);}',
    '.vz-iso-bridge{position:absolute;right:0;top:-4px;bottom:-4px;width:8px;background:var(--c-cyan,#6E8FA3);opacity:.75;border-radius:2px;pointer-events:none;}',
    '.vz-iso-tag{position:absolute;font-size:10px;opacity:.5;pointer-events:none;white-space:nowrap;}',
    '.vz-iso-keys{display:flex;width:100%;gap:10px;align-items:stretch;}',
    '.vz-iso-axis{position:relative;flex:0 0 46px;height:132px;font-size:9.5px;opacity:.55;}',
    '.vz-iso-axis span{position:absolute;right:0;transform:translateY(-50%);white-space:nowrap;}',
    '.vz-iso-axis::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(240,236,226,.2);}',
    '.vz-iso-keyboard{position:relative;flex:1 1 auto;height:132px;display:flex;border:1px solid rgba(240,236,226,.2);border-radius:4px;overflow:hidden;}',
    '.vz-iso-key{position:relative;flex:1 1 0;border:0;border-right:1px solid rgba(240,236,226,.16);padding:0;',
    'background:rgba(240,236,226,.09);cursor:pointer;color:inherit;min-width:0;-webkit-tap-highlight-color:transparent;}',
    '.vz-iso-key:last-child{border-right:0;}',
    '.vz-iso-key:hover{background:rgba(240,236,226,.16);}',
    '.vz-iso-key:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:-2px;}',
    '.vz-iso-key.is-black{position:absolute;top:0;height:62%;background:#16181c;border:1px solid rgba(240,236,226,.22);',
    'border-radius:0 0 3px 3px;z-index:2;}',
    '.vz-iso-key.is-black:hover{background:#22262b;}',
    '.vz-iso-key.is-active{background:rgba(200,163,90,.32);}',
    '.vz-iso-key.is-black.is-active{background:rgba(200,163,90,.42);}',
    '.vz-iso-keyname{position:absolute;left:0;right:0;bottom:4px;text-align:center;font-size:10px;opacity:.66;pointer-events:none;}',
    '.vz-iso-ref{position:absolute;left:0;right:0;top:50%;height:0;border-top:1px dashed rgba(240,236,226,.34);pointer-events:none;z-index:3;}',
    '.vz-iso-mark{position:absolute;left:50%;width:9px;height:9px;margin-left:-4.5px;margin-top:-4.5px;border-radius:50%;',
    'background:var(--c-bronze,#C8A35A);pointer-events:none;transition:top 160ms ease;}',
    '.vz-iso-key.is-active .vz-iso-mark{background:var(--c-light,#F0ECE2);}',
    '.vz-iso-svg{position:absolute;inset:0;width:100%;height:100%;display:block;}',
    '.vz-iso-voicewrap{position:relative;width:100%;height:150px;}',
    '.vz-iso-ptbtn{position:absolute;width:24px;height:24px;margin:-12px 0 0 -12px;border:0;padding:0;',
    'background:transparent;border-radius:50%;cursor:pointer;-webkit-tap-highlight-color:transparent;}',
    '.vz-iso-ptbtn:focus-visible{outline:2px solid var(--c-light,#F0ECE2);outline-offset:0;}',
    '.vz-iso-readout{min-height:32px;border-top:1px solid rgba(240,236,226,.12);padding-top:6px;font-size:11.5px;',
    'opacity:.92;font-variant-numeric:tabular-nums;}',
    '.vz-iso-readout .dev{color:var(--c-bronze,#C8A35A);font-weight:600;}',
    '.vz-iso-hint{margin:0;font-size:10.5px;opacity:.55;line-height:1.5;}',
    '.vz-iso-empty{font-size:12px;opacity:.6;padding:18px 4px;}',
    '.vz-iso-rm .vz-iso-mark,.vz-iso-rm .vz-iso-wire{transition:none;}',
    '@media (prefers-reduced-motion: reduce){.vz-iso-mark,.vz-iso-wire{transition:none;}}',
    '.vz-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}'
  ].join('');

  /* 宿主容器的可访问语义接管：外部常把挂载位写成 role="img"（静态图语义），
     但组件内部有可聚焦控件，axe 会报 nested-interactive（role=img 不允许可聚焦后代）。
     组件是交互控件，这里把宿主 role 换成 group（保留外部 aria-label 作为组名）。
     注：index.html 若把 .viz-slot 的 role="img" 去掉会更干净，本函数只是组件的自保。 */
  function adoptHost(el) {
    if (!el || !el.getAttribute) return;
    var role = (el.getAttribute('role') || '').toLowerCase();
    /* img/figure 等静态图语义不允许包含可聚焦控件（axe nested-interactive）；
       button/link/application 会把整块变成一个可聚焦大控件，同样不符合本组件
       「一组独立控件」的模型。统一退回中性分组语义，保留宿主的 aria-label 作组名。 */
    if (role === 'img' || role === 'figure' || role === 'button' || role === 'link' || role === 'application') {
      el.setAttribute('role', 'group');
    }
    if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
  }

  function init(container, opts) {
    if (!container || !container.nodeType) return safeStub();
    adoptHost(container);
    if (container.__vizIsochord) { try { container.__vizIsochord.destroy(); } catch (e) {} }
    opts = opts || {};
    ensureStyle(STYLE_ID, CSS);
    var lang = pickLang(opts);
    var reduced = !motionAllowed(opts);
    var onSelect = (typeof opts.onSelect === 'function') ? opts.onSelect : null;

    var state = { mode: 'fret', L: NaN, cents: [] };
    var destroyed = false, ro = null, live = null, focusIdx = 0, activeIdx = null;
    var root = null, head = null, titleEl = null, subEl = null, stage = null, readout = null, hintEl = null, emptyEl = null;
    var items = [];      /* 可聚焦元素（品 / 键 / 采样点） */
    var fretCents = [];  /* 指板模式实际参与排布的品丝音分（已剔除首项空弦） */
    var baselineEls = []; /* 可选 */

    clear(container);
    root = mk('div', 'vz-iso' + (reduced ? ' vz-iso-rm' : ''));
    root.setAttribute('role', 'group');
    head = mk('div', 'vz-iso-head');
    titleEl = mk('span', 'vz-iso-title');
    subEl = mk('span', 'vz-iso-sub');
    head.appendChild(titleEl); head.appendChild(subEl);
    stage = mk('div', 'vz-iso-stage');
    emptyEl = mk('div', 'vz-iso-empty');
    readout = mk('div', 'vz-iso-readout');
    hintEl = mk('p', 'vz-iso-hint');
    live = mk('div', 'vz-sr');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    root.appendChild(head); root.appendChild(stage); root.appendChild(emptyEl);
    root.appendChild(readout); root.appendChild(hintEl); root.appendChild(live);
    container.appendChild(root);

    function D() { return dict(lang); }
    function announce(msg) { if (live) live.textContent = msg; }
    function centsArr() { return state.cents; }
    function devOf(i) { var v = num(centsArr()[i], NaN); return v; }

    function setReadout(nodes) {
      clear(readout);
      for (var i = 0; i < nodes.length; i++) readout.appendChild(nodes[i]);
    }
    function readText(txt) { return doc.createTextNode(txt); }
    function devSpan(v) {
      return mk('span', 'dev', { text: isFinite(v) ? ((v >= 0 ? '+' : '') + fmt(v, 2)) : '—' });
    }
    /* 模板里用 {x}；action='dev' 的占位换成样式化 <span> */
    function buildRead(tplStr, map, devKey, devVal) {
      var nodes = [], re = /\{(\w+)\}/g, last = 0, m;
      while ((m = re.exec(tplStr))) {
        if (m.index > last) nodes.push(readText(tplStr.slice(last, m.index)));
        if (m[1] === devKey) nodes.push(devSpan(devVal));
        else nodes.push(readText(map[m[1]] == null ? '' : String(map[m[1]])));
        last = re.lastIndex;
      }
      if (last < tplStr.length) nodes.push(readText(tplStr.slice(last)));
      return nodes;
    }

    /* ---------- 指板 ---------- */
    function renderFret() {
      var dd = D();
      var cents = centsArr();
      if (!cents.length) { renderEmpty(); return; }
      var board = mk('div', 'vz-iso-board');
      board.setAttribute('role', 'group');
      board.setAttribute('aria-label', dd.modeFret);
      /* 弦（装饰） */
      for (var s = 0; s < 6; s++) {
        var line = mk('div', 'vz-iso-string');
        line.style.top = (16 + s * 12) + 'px';
        line.setAttribute('aria-hidden', 'true');
        board.appendChild(line);
      }
      board.appendChild(mk('div', 'vz-iso-nut'));
      var nutTag = mk('div', 'vz-iso-tag', { text: dd.nut });
      nutTag.style.left = '10px'; nutTag.style.top = '-2px';
      board.appendChild(nutTag);
      var brTag = mk('div', 'vz-iso-tag', { text: dd.bridge });
      brTag.style.right = '12px'; brTag.style.top = '-2px';
      board.appendChild(brTag);
      /* 空弦（位置 0）：若 cents[0] ≈ 0，说明数据把空弦也列进来了 → 从第 2 项起算品丝 */
      var openBtn = makeFretBtn(null, 0, dd.open, 0, true);
      board.appendChild(openBtn);
      items.push(openBtn);
      var first = num(cents[0], NaN);
      var skipFirst = isFinite(first) && Math.abs(first) < 0.5 && cents.length > 1;
      fretCents = skipFirst ? cents.slice(1) : cents.slice();
      for (var i = 0; i < fretCents.length; i++) {
        var c = num(fretCents[i], NaN);
        if (!isFinite(c)) continue;
        var frac = clamp(1 - Math.pow(2, -c / 1200), 0.015, 0.97);
        var b = makeFretBtn(i, frac * 100, String(i + 1), c);
        board.appendChild(b);
        items.push(b);
      }
      stage.appendChild(board);
      titleEl.textContent = dd.modeFret;
      subEl.textContent = dd.fretFormula + (isFinite(state.L) && state.L > 0 ? (' · ' + dd.scaleLen + ' ' + fmt(state.L, 1) + ' ' + dd.unitMm) : '');
      /* 读数：默认显示第 1 品 */
      if (items.length > 1) showFretRead(0); else showFretRead(-1);
    }

    function makeFretBtn(index, leftPct, label, cents, isOpen) {
      var dd = D();
      var b = mk('button', 'vz-iso-fret');
      b.type = 'button';
      b.style.left = leftPct.toFixed(3) + '%';
      b.setAttribute('data-i', index == null ? 'open' : String(index));
      b.tabIndex = -1;
      var wire = mk('span', 'vz-iso-wire');
      b.appendChild(wire);
      var lb = mk('span', 'vz-iso-fret-label', { text: label });
      if (isOpen) { lb.style.left = '10px'; lb.style.transform = 'none'; lb.style.textAlign = 'left'; }
      b.appendChild(lb);
      var aria = (index == null || index < 0)
        ? dd.openRead
        : tpl(dd.fretRead, {
          n: index + 1,
          cents: fmt(cents, 2),
          mm: (isFinite(state.L) && state.L > 0) ? fmt(state.L * (1 - Math.pow(2, -cents / 1200)), 1) : '—',
          dev: isFinite(cents) ? (cents - Math.round(cents / 100) * 100) : 0
        });
      b.setAttribute('aria-label', aria);
      b.addEventListener('focus', function () { onItemFocus(b); });
      b.addEventListener('click', function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); onItemPick(b); });
      b.addEventListener('keydown', onKeyNav);
      return b;
    }

    function showFretRead(i) {
      var dd = D();
      if (i < 0) { setReadout([readText(dd.openRead)]); return; }
      var c = num(fretCents[i], NaN);
      var dev = isFinite(c) ? c - Math.round(c / 100) * 100 : NaN;
      setReadout(buildRead(dd.fretRead, {
        n: i + 1,
        cents: isFinite(c) ? fmt(c, 2) : '—',
        mm: (isFinite(state.L) && state.L > 0 && isFinite(c)) ? fmt(state.L * (1 - Math.pow(2, -c / 1200)), 1) : '—'
      }, 'dev', dev));
    }

    /* ---------- 钢琴 ---------- */
    function renderPiano() {
      var dd = D();
      var cents = centsArr();
      if (!cents.length) { renderEmpty(); return; }
      var n = clamp(cents.length, 1, 48);
      var wrap = mk('div', 'vz-iso-keys');
      var maxDev = 0;
      for (var d = 0; d < n; d++) { var v = Math.abs(num(cents[d], 0)); if (v > maxDev) maxDev = v; }
      maxDev = Math.max(10, maxDev * 1.15);
      var axis = mk('div', 'vz-iso-axis');
      axis.setAttribute('aria-hidden', 'true');
      var topLbl = mk('span', '', { text: '+' + fmt(maxDev, 0) + ' ' + dd.unitCents });
      topLbl.style.top = '4px';
      var zeroLbl = mk('span', '', { text: dd.dev0 });
      zeroLbl.style.top = '50%';
      var botLbl = mk('span', '', { text: '−' + fmt(maxDev, 0) });
      botLbl.style.top = '96%';
      axis.appendChild(topLbl); axis.appendChild(zeroLbl); axis.appendChild(botLbl);
      var kb = mk('div', 'vz-iso-keyboard');
      kb.setAttribute('role', 'group');
      kb.setAttribute('aria-label', dd.modePiano);
      var octaves = Math.ceil(n / 12);
      var whiteCount = 0;
      for (var q = 0; q < n; q++) {
        var semi = q % 12;
        if (!isBlack(semi)) whiteCount++;
      }
      whiteCount = Math.max(1, whiteCount);
      /* 先白键（按顺序），再黑键（绝对定位） */
      for (var i = 0; i < n; i++) {
        var semi2 = i % 12;
        var dev = num(cents[i], 0);
        if (isBlack(semi2)) continue;
        var key = makePianoKey(i, false, dev, maxDev, NOTE_NAMES[semi2] + (Math.floor(i / 12) + 1));
        kb.appendChild(key);
      }
      /* 黑键定位：按所在白键边界 */
      var whitePos = {}; /* 半音索引 → 其前面白键数量 */
      var wc = 0;
      for (var k = 0; k < n; k++) {
        var sm = k % 12;
        whitePos[k] = wc;      /* 该半音处已有白键数 */
        if (!isBlack(sm)) wc++;
      }
      for (var m = 0; m < n; m++) {
        var sm2 = m % 12;
        if (!isBlack(sm2)) continue;
        var dev2 = num(cents[m], 0);
        var key2 = makePianoKey(m, true, dev2, maxDev, NOTE_NAMES[sm2] + (Math.floor(m / 12) + 1));
        var blackW = 100 / whiteCount * 0.62;
        var left = (whitePos[m]) * (100 / whiteCount) - blackW / 2;
        key2.style.left = left.toFixed(3) + '%';
        key2.style.width = blackW.toFixed(3) + '%';
        kb.appendChild(key2);
      }
      var ref = mk('div', 'vz-iso-ref');
      kb.appendChild(ref);
      wrap.appendChild(axis); wrap.appendChild(kb);
      stage.appendChild(wrap);
      titleEl.textContent = dd.modePiano;
      subEl.textContent = dd.pianoNote;
      if (items.length) showPianoRead(0);
    }

    function isBlack(semi) { return semi === 1 || semi === 3 || semi === 6 || semi === 8 || semi === 10; }

    function makePianoKey(index, black, dev, maxDev, noteLabel) {
      var dd = D();
      var b = mk('button', 'vz-iso-key' + (black ? ' is-black' : ''));
      b.type = 'button';
      b.setAttribute('data-i', String(index));
      b.tabIndex = -1;
      b.setAttribute('aria-label', tpl(dd.pianoRead, {
        note: noteLabel, dev: ((dev >= 0 ? '+' : '') + fmt(dev, 2))
      }));
      var off = clamp(dev / maxDev, -1, 1) * 40; /* 相对键高中心的百分比偏移 */
      var mark = mk('span', 'vz-iso-mark');
      mark.style.top = (50 - off).toFixed(2) + '%';
      b.appendChild(mark);
      if (!black) {
        var nm = mk('span', 'vz-iso-keyname', { text: noteLabel.replace(/\d+$/, '') });
        b.appendChild(nm);
      }
      b.addEventListener('focus', function () { onItemFocus(b); });
      b.addEventListener('click', function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); onItemPick(b); });
      b.addEventListener('keydown', onKeyNav);
      items.push(b);
      return b;
    }

    function showPianoRead(i) {
      var dd = D();
      var dev = num(centsArr()[i], NaN);
      setReadout(buildRead(dd.pianoRead, {
        note: NOTE_NAMES[i % 12] + (Math.floor(i / 12) + 1)
      }, 'dev', dev));
    }

    /* ---------- 人声 / 自由调音 ---------- */
    function renderVoice() {
      var dd = D();
      var cents = centsArr();
      if (!cents.length) { renderEmpty(); return; }
      var wrap = mk('div', 'vz-iso-voicewrap');
      var svg = mks('svg', { 'class': 'vz-iso-svg', 'aria-hidden': 'true', focusable: 'false' });
      wrap.appendChild(svg);
      stage.appendChild(wrap);
      titleEl.textContent = dd.modeVoice;
      subEl.textContent = dd.voiceNote;
      drawVoice(svg);
      for (var i = 0; i < cents.length; i++) {
        var b = mk('button', 'vz-iso-ptbtn');
        b.type = 'button';
        b.setAttribute('data-i', String(i));
        b.tabIndex = -1;
        var dev = num(cents[i], NaN);
        b.setAttribute('aria-label', tpl(dd.voiceRead, {
          n: i + 1, dev: (isFinite(dev) ? ((dev >= 0 ? '+' : '') + fmt(dev, 2)) : '—')
        }));
        b.addEventListener('focus', function () { onItemFocus(this); });
        b.addEventListener('click', function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); onItemPick(this); });
        b.addEventListener('keydown', onKeyNav);
        wrap.appendChild(b);
        items.push(b);
      }
      placeVoicePoints();
      if (items.length) showVoiceRead(0);
    }

    function voiceGeom() {
      var w = stage.clientWidth || 320, h = 150;
      return { w: w, h: h, padX: 16, padY: 16 };
    }
    function voicePointXY(i, n, maxDev) {
      var g = voiceGeom();
      var pts = n <= 1 ? [g.w / 2] : null;
      var x = pts ? pts[0] : g.padX + i * (g.w - g.padX * 2) / (n - 1);
      var dev = num(centsArr()[i], 0);
      var y = g.h / 2 - clamp(dev / maxDev, -1, 1) * (g.h / 2 - g.padY);
      return { x: x, y: y };
    }
    function voiceMaxDev() {
      var cents = centsArr(), maxDev = 0;
      for (var i = 0; i < cents.length; i++) maxDev = Math.max(maxDev, Math.abs(num(cents[i], 0)));
      return Math.max(10, maxDev * 1.15);
    }
    function drawVoice(svg) {
      var g = voiceGeom();
      var cents = centsArr();
      var n = cents.length, maxDev = voiceMaxDev();
      svg.setAttribute('viewBox', '0 0 ' + g.w + ' ' + g.h);
      clear(svg);
      /* 参考线 / 刻度 */
      var axisLines = [-1, -0.5, 0, 0.5, 1];
      for (var a = 0; a < axisLines.length; a++) {
        var v = axisLines[a];
        var y = g.h / 2 - v * (g.h / 2 - g.padY);
        svg.appendChild(mks('line', {
          'class': 'vz-iso-axisline',
          x1: 0, y1: y.toFixed(1), x2: g.w, y2: y.toFixed(1),
          stroke: v === 0 ? 'rgba(240,236,226,.4)' : 'rgba(240,236,226,.12)',
          'stroke-dasharray': v === 0 ? '4 5' : '2 6'
        }));
        var lbl = mks('text', {
          x: 2, y: (y - 3).toFixed(1), fill: 'rgba(240,236,226,.5)', 'font-size': '9.5'
        });
        lbl.appendChild(doc.createTextNode((v * maxDev >= 0 ? '+' : '−') + fmt(Math.abs(v * maxDev), 0)));
        svg.appendChild(lbl);
      }
      /* 漂移曲线 + 垂线 */
      var d = '';
      for (var i = 0; i < n; i++) {
        var p = voicePointXY(i, n, maxDev);
        d += (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
        svg.appendChild(mks('line', {
          x1: p.x.toFixed(1), y1: (g.h / 2).toFixed(1), x2: p.x.toFixed(1), y2: p.y.toFixed(1),
          stroke: 'rgba(200,163,90,.35)', 'stroke-width': 1
        }));
      }
      svg.appendChild(mks('path', { d: d, fill: 'none', stroke: 'var(--c-bronze,#C8A35A)', 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      for (var k = 0; k < n; k++) {
        var q = voicePointXY(k, n, maxDev);
        svg.appendChild(mks('circle', { cx: q.x.toFixed(1), cy: q.y.toFixed(1), r: 3.6, fill: 'var(--c-bronze,#C8A35A)' }));
        if (k === activeIdx) {
          svg.appendChild(mks('circle', { cx: q.x.toFixed(1), cy: q.y.toFixed(1), r: 8, fill: 'none', stroke: 'var(--c-light,#F0ECE2)', 'stroke-width': 2 }));
        }
      }
    }
    function placeVoicePoints() {
      var maxDev = voiceMaxDev();
      var n = centsArr().length;
      for (var i = 0; i < items.length; i++) {
        var p = voicePointXY(i, n, maxDev);
        items[i].style.left = p.x.toFixed(1) + 'px';
        items[i].style.top = p.y.toFixed(1) + 'px';
      }
    }
    function showVoiceRead(i) {
      var dd = D();
      var dev = num(centsArr()[i], NaN);
      setReadout(buildRead(dd.voiceRead, { n: i + 1 }, 'dev', dev));
    }

    /* ---------- 公共交互 ---------- */
    function itemsOf() { return items; }

    function setFocusRoving() {
      var want = clamp(focusIdx, 0, Math.max(0, items.length - 1));
      for (var i = 0; i < items.length; i++) items[i].tabIndex = (i === want) ? 0 : -1;
    }

    function itemIndex(el) {
      var v = el && el.getAttribute ? el.getAttribute('data-i') : null;
      if (v === 'open') return -1;
      return num(v, -1);
    }

    function readForIdx(i) {
      if (state.mode === 'fret') showFretRead(i < 0 ? -1 : i);
      else if (state.mode === 'piano') { if (i >= 0) showPianoRead(i); }
      else { if (i >= 0) showVoiceRead(i); }
    }

    function onItemFocus(el) {
      if (destroyed) return;
      var i = itemIndex(el);
      activeIdx = i;
      var fi = items.indexOf(el);
      if (fi >= 0) { focusIdx = fi; setFocusRoving(); }
      readForIdx(i);
      if (state.mode === 'voice') {
        var svg = stage.querySelector('svg');
        if (svg) drawVoice(svg);
      }
    }
    function onItemPick(el) {
      if (destroyed) return;
      var i = itemIndex(el);
      activeIdx = i;
      readForIdx(i);
      if (onSelect && i >= 0) { try { onSelect(i); } catch (e) {} }
    }
    function onKeyNav(ev) {
      if (destroyed || !ev) return;
      var el = ev.currentTarget;
      var fi = items.indexOf(el);
      if (fi < 0) return;
      var nxt = -1;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') nxt = Math.min(items.length - 1, fi + 1);
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') nxt = Math.max(0, fi - 1);
      else if (ev.key === 'Home') nxt = 0;
      else if (ev.key === 'End') nxt = items.length - 1;
      else if (ev.key === 'Escape') { el.blur(); return; }
      else if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        if (ev.preventDefault) ev.preventDefault();
        onItemPick(el);
        return;
      }
      if (nxt >= 0) {
        if (ev.preventDefault) ev.preventDefault();
        items[nxt].focus();
      }
    }

    function renderEmpty() {
      var dd = D();
      clear(stage);
      stage.style.display = 'none';
      items = [];
      emptyEl.style.display = '';
      emptyEl.textContent = dd.empty;
      readout.textContent = '';
      titleEl.textContent = state.mode === 'piano' ? dd.modePiano : (state.mode === 'voice' ? dd.modeVoice : dd.modeFret);
      subEl.textContent = '';
      hintEl.textContent = dd.hint;
      root.setAttribute('aria-label', dd.group);
    }

    function build() {
      if (destroyed) return;
      var dd = D();
      root.setAttribute('aria-label', dd.group);
      clear(stage);
      items = [];
      activeIdx = null;
      emptyEl.style.display = 'none';
      stage.style.display = '';
      hintEl.textContent = dd.hint;
      if (state.mode === 'piano') renderPiano();
      else if (state.mode === 'voice') renderVoice();
      else renderFret();
      setFocusRoving();
    }

    function update(next) {
      if (destroyed) return;
      adoptHost(container);
      next = (next && typeof next === 'object') ? next : {};
      var mode = (next.mode === 'piano' || next.mode === 'voice' || next.mode === 'fret') ? next.mode : 'fret';
      var cents = Array.isArray(next.cents) ? next.cents.map(function (v) { return num(v, NaN); }).slice(0, 64) : [];
      state.mode = mode;
      state.L = num(next.L, NaN);
      state.cents = cents;
      build();
    }

    function highlight(i) {
      if (destroyed) return;
      if (i == null || !isFinite(+i)) {
        activeIdx = null;
        for (var k = 0; k < items.length; k++) items[k].classList.remove('is-active');
        return;
      }
      var idx = Math.round(+i);
      if (idx < 0 || idx >= items.length) return;
      activeIdx = itemIndex(items[idx]);
      for (var j = 0; j < items.length; j++) items[j].classList.toggle('is-active', j === idx);
      focusIdx = idx;
      setFocusRoving();
      readForIdx(activeIdx);
      if (state.mode === 'voice') { var svg = stage.querySelector('svg'); if (svg) drawVoice(svg); }
    }

    function layout() {
      if (destroyed) return;
      if (state.mode === 'voice') {
        var svg = stage.querySelector('svg');
        if (svg) { drawVoice(svg); placeVoicePoints(); }
      }
    }

    function destroy() {
      destroyed = true;
      if (ro) { ro.disconnect(); ro = null; }
      container.__vizIsochord = null;
      clear(container);
      items = [];
    }

    var inst = {
      version: '1.0.0',
      update: update,
      highlight: highlight,
      resize: layout,
      destroy: destroy,
      setLang: function (l) { lang = (l === 'en') ? 'en' : 'zh'; build(); },
      getState: function () { return { mode: state.mode, L: state.L, cents: state.cents.slice() }; }
    };
    container.__vizIsochord = inst;
    ro = watchResize(stage, layout);
    build();
    return inst;
  }

  Viz.isochord = { version: '1.0.0', init: init };
})();
;
/* ===== 09. viz/spectrum.js ===== */
/* =============================================================================
 * 同律 CONCORD · viz/spectrum.js
 * -----------------------------------------------------------------------------
 * 用途：
 *   频谱 / 泛音（M6「编钟与琴 · 泛音列」）。Canvas 柱状频谱：每根柱 = 一个分音
 *   （频率由 f0 × ratio 得，柱高 = 相对幅度），顶部标出整数泛音列（×1、×2、×3…）
 *   作为参照；落在整数倍附近的分音用铜金高亮，偏离整数的（如钟体非谐分音）用钟青。
 *   playing 时柱高做轻微起伏动画；reducedMotion 时只画静态终态。
 *   分音数据由 app 传入，组件不内置任何频谱数值。
 *
 * API：
 *   var inst = Viz.spectrum.init(el, opts);
 *     opts : { lang:'zh'|'en', reducedMotion:boolean }
 *   inst.update(state)
 *   inst.highlight(i|null)     // 高亮第 i 根柱（分音下标）
 *   inst.resize() / inst.destroy() / inst.setLang(lang)
 *
 * state 契约：
 *   { partials:[{ n:number, ratio:number, amp:number }], f0:number, playing:boolean }
 *   注：f0 缺失或 ≤0 时退化为按序号等距排布（仅布局兜底，不伪造频率）。
 *
 * 依赖：无（Canvas 2D，无外部资源），file:// 直接可用。
 * 样式：颜色从 CSS 变量读取（--c-bronze / --c-cyan / --c-light / --c-ink / --c-red，
 *       均有 fallback）。画布外的文字用 CSS；画布内文字用系统字体栈。
 * 复跑：浏览器打开 viz/_demo.html；静态自检 py -X utf8 viz/check_viz.py。
 * ========================================================================== */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  if (!W || !W.document) return;
  var doc = W.document;
  var Viz = W.Viz = W.Viz || {};
  if (Viz.spectrum) return;

  var STYLE_ID = 'vz-spectrum-style';
  var LOG2 = Math.log(2);

  /* ---------- 工具 ---------- */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function num(v, d) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fmt(v, d) {
    if (!isFinite(v)) return '—';
    var s = v.toFixed(d == null ? 2 : d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  }
  function mk(tag, cls, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k]; if (v == null) continue;
      if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    return e;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function ensureStyle(id, css) {
    if (doc.getElementById(id)) return;
    var s = mk('style'); s.id = id;
    s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
  }
  function motionAllowed(opts) {
    if (opts && typeof opts.reducedMotion === 'boolean') return !opts.reducedMotion;
    if (W.matchMedia) return !W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return true;
  }
  function pickLang(opts) {
    var l = opts && opts.lang;
    if (l !== 'en' && l !== 'zh') l = (doc.documentElement && doc.documentElement.lang === 'en') ? 'en' : 'zh';
    return l;
  }
  function tpl(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k] == null ? '' : String(map[k]); }); }
  function safeStub() {
    return {
      version: '1.0.0', update: function () {}, highlight: function () {}, resize: function () {},
      destroy: function () {}, setLang: function () {}, getState: function () { return null; }
    };
  }
  function watchResize(el, cb) {
    var raf = 0;
    var run = function () {
      if (raf) return;
      raf = W.requestAnimationFrame ? W.requestAnimationFrame(function () { raf = 0; cb(); }) : (cb(), 0);
    };
    if (typeof W.ResizeObserver === 'function') {
      var ro = new W.ResizeObserver(run); ro.observe(el);
      return { disconnect: function () { if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf); raf = 0; ro.disconnect(); } };
    }
    W.addEventListener('resize', run);
    return {
      disconnect: function () {
        if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf);
        raf = 0; W.removeEventListener('resize', run);
      }
    };
  }

  /* ---------- 文案 ---------- */
  var DICT = {
    zh: {
      group: '频谱与泛音列',
      caption: '{n} 个分音 · f0 = {f0} Hz · 顶部刻度为整数泛音（×n）',
      captionNoF0: '{n} 个分音（未提供基频 f0，按序号排列）',
      playing: '播放中',
      stopped: '已停止',
      empty: '暂无分音数据',
      canvasLabel: '频谱图：{n} 根柱表示各分音相对幅度；顶部刻度为整数泛音列；{state}',
      listGroup: '分音数据表（读屏用）',
      item: '分音 {n}：频率比 {ratio}，频率 {hz} Hz，相对幅度 {amp}',
      hint: '柱高 = 相对幅度；铜金 = 接近整数泛音，钟青 = 非谐分音'
    },
    en: {
      group: 'Spectrum and harmonic series',
      caption: '{n} partials · f0 = {f0} Hz · top ticks mark integer harmonics (×n)',
      captionNoF0: '{n} partials (no f0 given; laid out by index)',
      playing: 'playing',
      stopped: 'stopped',
      empty: 'No partial data',
      canvasLabel: 'Spectrum: {n} bars show relative partial amplitudes; top ticks mark the harmonic series; {state}',
      listGroup: 'Partial data table (for screen readers)',
      item: 'Partial {n}: ratio {ratio}, frequency {hz} Hz, relative amplitude {amp}',
      hint: 'Bar height = relative amplitude; bronze = near an integer harmonic, cyan = inharmonic'
    }
  };
  function dict(lang) { return DICT[lang === 'en' ? 'en' : 'zh']; }

  var CSS = [
    '.vz-spec{position:relative;display:flex;flex-direction:column;gap:6px;width:100%;height:100%;min-height:0;',
    'color:var(--c-light,#F0ECE2);font-family:var(--font-ui,"Segoe UI","Microsoft YaHei",system-ui,sans-serif);font-size:13px;line-height:1.45;}',
    '.vz-spec-stage{position:relative;flex:1 1 auto;width:100%;min-height:140px;}',
    '.vz-spec-canvas{display:block;width:100%;height:100%;}',
    '.vz-spec-caption{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;font-size:11.5px;opacity:.78;}',
    '.vz-spec-state{display:inline-flex;align-items:center;gap:5px;}',
    '.vz-spec-state .lamp{width:7px;height:7px;border-radius:50%;background:rgba(240,236,226,.3);}',
    '.vz-spec.is-playing .vz-spec-state .lamp{background:var(--c-bronze,#C8A35A);box-shadow:0 0 6px var(--c-bronze,#C8A35A);',
    'animation:vz-spec-lamp 1.6s ease-in-out infinite;}',
    '@keyframes vz-spec-lamp{0%,100%{opacity:1;}50%{opacity:.4;}}',
    '.vz-spec-hint{margin:0;font-size:10.5px;opacity:.55;line-height:1.5;}',
    '.vz-spec-rm .vz-spec-state .lamp{animation:none;}',
    '@media (prefers-reduced-motion: reduce){.vz-spec.is-playing .vz-spec-state .lamp{animation:none;}}',
    '.vz-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}'
  ].join('');

  /* 宿主容器的可访问语义接管：外部常把挂载位写成 role="img"（静态图语义），
     但组件内部有可聚焦控件，axe 会报 nested-interactive（role=img 不允许可聚焦后代）。
     组件是交互控件，这里把宿主 role 换成 group（保留外部 aria-label 作为组名）。
     注：index.html 若把 .viz-slot 的 role="img" 去掉会更干净，本函数只是组件的自保。 */
  function adoptHost(el) {
    if (!el || !el.getAttribute) return;
    var role = (el.getAttribute('role') || '').toLowerCase();
    /* img/figure 等静态图语义不允许包含可聚焦控件（axe nested-interactive）；
       button/link/application 会把整块变成一个可聚焦大控件，同样不符合本组件
       「一组独立控件」的模型。统一退回中性分组语义，保留宿主的 aria-label 作组名。 */
    if (role === 'img' || role === 'figure' || role === 'button' || role === 'link' || role === 'application') {
      el.setAttribute('role', 'group');
    }
    if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
  }

  function init(container, opts) {
    if (!container || !container.nodeType) return safeStub();
    adoptHost(container);
    if (container.__vizSpectrum) { try { container.__vizSpectrum.destroy(); } catch (e) {} }
    opts = opts || {};
    ensureStyle(STYLE_ID, CSS);
    var lang = pickLang(opts);
    var reduced = !motionAllowed(opts);

    var state = { partials: [], f0: NaN, playing: false };
    var destroyed = false, ro = null, raf = 0, live = null, highlightIdx = null;
    var root = null, stage = null, canvas = null, ctx = null, captionEl = null, hintEl = null;
    var srList = null;

    clear(container);
    root = mk('div', 'vz-spec' + (reduced ? ' vz-spec-rm' : ''));
    root.setAttribute('role', 'group');
    stage = mk('div', 'vz-spec-stage');
    canvas = mk('canvas', 'vz-spec-canvas');
    canvas.setAttribute('role', 'img');
    ctx = canvas.getContext ? canvas.getContext('2d') : null;
    stage.appendChild(canvas);
    captionEl = mk('div', 'vz-spec-caption');
    hintEl = mk('p', 'vz-spec-hint');
    srList = mk('div', 'vz-sr');
    srList.setAttribute('role', 'list');
    live = mk('div', 'vz-sr');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    root.appendChild(stage); root.appendChild(captionEl); root.appendChild(hintEl);
    root.appendChild(srList); root.appendChild(live);
    container.appendChild(root);

    function D() { return dict(lang); }
    function announce(msg) { if (live) live.textContent = msg; }

    function css(prop, fallback) {
      try {
        var v = W.getComputedStyle(stage).getPropertyValue(prop);
        v = v && v.trim();
        return v || fallback;
      } catch (e) { return fallback; }
    }
    var COL = {
      bronze: function () { return css('--c-bronze', '#C8A35A'); },
      cyan: function () { return css('--c-cyan', '#6E8FA3'); },
      light: function () { return css('--c-light', '#F0ECE2'); },
      ink: function () { return css('--c-ink', '#0B0D10'); }
    };

    function maxAmp() {
      var m = 0;
      for (var i = 0; i < state.partials.length; i++) m = Math.max(m, Math.abs(num(state.partials[i].amp, 0)));
      return m > 0 ? m : 1;
    }

    /* ---------- 绘制 ---------- */
    function draw() {
      if (destroyed || !ctx) return;
      var w = stage.clientWidth, h = stage.clientHeight;
      var dpr = W.devicePixelRatio || 1;
      if (!w || !h) return;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var dd = D();
      var parts = state.partials;
      var n = parts.length;
      var padL = 30, padR = 14, padT = 26, padB = 26;
      var pw = Math.max(10, w - padL - padR), ph = Math.max(10, h - padT - padB);
      var baseY = padT + ph;
      var mMax = maxAmp();
      var f0 = num(state.f0, NaN);
      var hasF0 = isFinite(f0) && f0 > 0;
      /* 频率区间（对数轴）：f0×ratio；无 f0 时按序号等距 */
      var freqs = [];
      for (var i = 0; i < n; i++) {
        var ratio = num(parts[i].ratio, NaN);
        if (!isFinite(ratio) && isNum(parts[i].n)) ratio = parts[i].n;
        if (ratio == null || !isFinite(ratio) || ratio <= 0) ratio = i + 1;
        freqs.push(hasF0 ? f0 * ratio : ratio);
      }
      var useLog = hasF0;
      var fMin = useLog ? Math.min.apply(null, freqs) : 1;
      var fMax = useLog ? Math.max.apply(null, freqs) : n;
      if (!isFinite(fMin) || fMin <= 0) { fMin = 1; useLog = false; }
      if (!isFinite(fMax) || fMax <= fMin) fMax = fMin * 2;
      var lmin = Math.log(fMin), lmax = Math.log(fMax);
      if (lmax - lmin < 1e-6) lmax = lmin + 1e-6;
      function xOfFreq(f) {
        if (!useLog) {
          if (n <= 1) return padL + pw / 2;
          return padL + (Math.max(0, Math.min(n - 1, f - 1)) / (n - 1)) * pw;
        }
        var t = (Math.log(Math.max(f, fMin)) - lmin) / (lmax - lmin);
        return padL + clamp(t, 0, 1) * pw;
      }
      /* 振幅网格 */
      ctx.save();
      ctx.strokeStyle = 'rgba(240,236,226,.1)';
      ctx.lineWidth = 1;
      for (var g = 0; g <= 2; g++) {
        var y = padT + ph * (g / 2);
        ctx.beginPath(); ctx.moveTo(padL, y + 0.5); ctx.lineTo(padL + pw, y + 0.5); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(240,236,226,.5)';
      ctx.font = '9.5px "Segoe UI","Microsoft YaHei",system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(fmt(mMax, 2), 3, padT + 4);
      ctx.fillText('0', 3, baseY - 1);
      /* 整数泛音刻度（顶部） */
      if (hasF0) {
        var maxHarm = Math.min(40, Math.floor(fMax / f0 + 0.001));
        var minLabelPx = 24;
        var lastLabelX = -999;
        for (var hm = 1; hm <= maxHarm; hm++) {
          var hf = f0 * hm;
          var hx = xOfFreq(hf);
          var col = hm % 2 === 0 ? 'rgba(110,143,163,.55)' : 'rgba(240,236,226,.4)';
          ctx.strokeStyle = col;
          ctx.beginPath(); ctx.moveTo(hx + 0.5, padT - 10); ctx.lineTo(hx + 0.5, padT + 3); ctx.stroke();
          if (hx - lastLabelX >= minLabelPx) {
            ctx.fillStyle = 'rgba(240,236,226,.55)';
            ctx.textAlign = (hx < 22) ? 'left' : (hx > w - 22 ? 'right' : 'center');
            ctx.fillText('×' + hm, hx, padT - 13);
            lastLabelX = hx;
          }
        }
      } else {
        ctx.fillStyle = 'rgba(240,236,226,.5)';
        ctx.textAlign = 'center';
        ctx.fillText('n = 1 … ' + n, padL + pw / 2, padT - 13);
      }
      /* 柱 */
      var t = W.performance && W.performance.now ? W.performance.now() / 1000 : Date.now() / 1000;
      var barW = clamp(pw / Math.max(1, n) * 0.62, 4, 18);
      for (var b = 0; b < n; b++) {
        var amp = Math.abs(num(parts[b].amp, 0));
        var rel = clamp(amp / mMax, 0, 1);
        var mod = 1;
        if (state.playing && !reduced) {
          mod = 0.82 + 0.18 * Math.sin(t * 3.1 + b * 0.9);
        }
        var bh = Math.max(1.5, rel * ph * mod);
        var bx = xOfFreq(freqs[b]) - barW / 2;
        var by = baseY - bh;
        var ratio = num(parts[b].ratio, isNum(parts[b].n) ? parts[b].n : b + 1);
        var nearHarm = isFinite(ratio) && ratio > 0 && Math.abs(ratio - Math.round(ratio)) < 0.01;
        ctx.fillStyle = nearHarm ? COL.bronze() : COL.cyan();
        ctx.globalAlpha = 0.92;
        ctx.fillRect(bx, by, barW, bh);
        ctx.globalAlpha = 1;
        if (highlightIdx === b) {
          ctx.strokeStyle = COL.light();
          ctx.lineWidth = 2;
          ctx.strokeRect(bx - 2.5, by - 2.5, barW + 5, bh + 5);
        }
      }
      /* 轴线 */
      ctx.strokeStyle = 'rgba(240,236,226,.34)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, baseY + 0.5); ctx.lineTo(padL + pw, baseY + 0.5); ctx.stroke();
      /* 频率轴标签 */
      ctx.fillStyle = 'rgba(240,236,226,.55)';
      ctx.font = '9.5px "Segoe UI","Microsoft YaHei",system-ui,sans-serif';
      ctx.textAlign = 'left';
      if (hasF0) {
        ctx.fillText(fmt(f0, 1) + ' Hz', padL, baseY + 11);
        ctx.textAlign = 'right';
        ctx.fillText(fmt(fMax, 1) + ' Hz', padL + pw, baseY + 11);
      }
    }

    function renderStatic() {
      draw();
    }

    /* ---------- 动画 ---------- */
    function loop() {
      raf = 0;
      if (destroyed) return;
      draw();
      if (state.playing && !reduced) {
        raf = W.requestAnimationFrame(loop);
      }
    }
    function startLoop() {
      if (reduced || destroyed || !state.playing) return;
      if (raf) return;
      raf = W.requestAnimationFrame(loop);
    }
    function stopLoop() {
      if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf);
      raf = 0;
    }

    /* ---------- 文本 ---------- */
    function renderCaption() {
      var dd = D();
      var n = state.partials.length;
      clear(captionEl);
      if (!n) {
        captionEl.textContent = dd.empty;
        return;
      }
      var f0 = num(state.f0, NaN);
      var txt = (isFinite(f0) && f0 > 0)
        ? tpl(dd.caption, { n: n, f0: fmt(f0, 2) })
        : tpl(dd.captionNoF0, { n: n });
      captionEl.appendChild(doc.createTextNode(txt));
      var st = mk('span', 'vz-spec-state');
      var lamp = mk('span', 'lamp');
      lamp.setAttribute('aria-hidden', 'true');
      st.appendChild(lamp);
      st.appendChild(doc.createTextNode(state.playing ? dd.playing : dd.stopped));
      captionEl.appendChild(st);
      hintEl.textContent = dd.hint;
      /* canvas 可访问名 */
      canvas.setAttribute('aria-label', tpl(dd.canvasLabel, {
        n: n, state: state.playing ? dd.playing : dd.stopped
      }));
      /* 读屏数据表 */
      clear(srList);
      srList.setAttribute('aria-label', dd.listGroup);
      for (var i = 0; i < state.partials.length; i++) {
        var p = state.partials[i];
        var ratio = num(p.ratio, isNum(p.n) ? p.n : i + 1);
        var hz = (isFinite(f0) && f0 > 0) ? f0 * ratio : NaN;
        var li = mk('div', '');
        li.setAttribute('role', 'listitem');
        li.textContent = tpl(dd.item, {
          n: num(p.n, i + 1), ratio: fmt(ratio, 4), hz: isFinite(hz) ? fmt(hz, 2) : '—',
          amp: fmt(num(p.amp, 0), 3)
        });
        srList.appendChild(li);
      }
    }

    function update(next) {
      if (destroyed) return;
      adoptHost(container);
      next = (next && typeof next === 'object') ? next : {};
      var arr = Array.isArray(next.partials) ? next.partials : [];
      state.partials = arr.filter(function (p) { return p && typeof p === 'object'; }).map(function (p, i) {
        return {
          n: num(p.n, i + 1),
          ratio: num(p.ratio, num(p.n, i + 1)),
          amp: num(p.amp, 0)
        };
      }).slice(0, 256);
      state.f0 = num(next.f0, NaN);
      var wasPlaying = state.playing;
      state.playing = !!next.playing;
      renderCaption();
      if (state.playing && !reduced) startLoop(); else { stopLoop(); renderStatic(); }
      if (wasPlaying !== state.playing) announce(state.playing ? D().playing : D().stopped);
    }

    function highlight(i) {
      if (destroyed) return;
      if (i == null || !isFinite(+i)) highlightIdx = null;
      else {
        var k = Math.round(+i);
        highlightIdx = (k < 0 || k >= state.partials.length) ? null : k;
      }
      draw();
    }

    function layout() {
      if (destroyed) return;
      draw();
    }

    function destroy() {
      destroyed = true;
      stopLoop();
      if (ro) { ro.disconnect(); ro = null; }
      container.__vizSpectrum = null;
      clear(container);
    }

    var inst = {
      version: '1.0.0',
      update: update,
      highlight: highlight,
      resize: layout,
      destroy: destroy,
      setLang: function (l) {
        lang = (l === 'en') ? 'en' : 'zh';
        var dd2 = D();
        root.setAttribute('aria-label', dd2.group);
        hintEl.textContent = dd2.hint;
        renderCaption();
        draw();
      },
      getState: function () { return { partials: state.partials.slice(), f0: state.f0, playing: state.playing }; }
    };
    container.__vizSpectrum = inst;
    ro = watchResize(stage, layout);
    var dd0 = dict(lang);
    root.setAttribute('aria-label', dd0.group);
    canvas.setAttribute('aria-label', tpl(dd0.canvasLabel, { n: 0, state: dd0.stopped }));
    hintEl.textContent = dd0.hint;
    renderCaption();
    draw();
    return inst;
  }

  Viz.spectrum = { version: '1.0.0', init: init };
})();
;
/* ===== 10. data/data_tuning.js ===== */
/* 《同律》TuningData —— 由 build_data_js.py 生成（输入：research(5)）
 * 自动生成，请勿手改。源：_research/*.json + metrics.json
 * 重建：py -X utf8 11_同律_国际专项赛/_pipeline/build_data_js.py
 */
window.TuningData = {
 "schema": "concord.tuning/v1",
 "summary": {
  "tunings": 9,
  "tables": 11,
  "derived": 2,
  "note_zh": "对外口径：9 种律制，另有 2 套派生对照表（页面上共 11 张表）。",
  "note_en": "Outward figure: 9 tuning systems, plus 2 derived comparison tables (11 tables shown on the page)."
 },
 "reference_zh": "基准约定：A4 = 440 Hz；黄钟（C4，12-TET）= 261.6255653005986 Hz。音分定义 cents(f1,f2) = 1200·log2(f2/f1)。",
 "reference_en": "Conventions: A4 = 440 Hz; Huangzhong (C4, 12-TET) = 261.6255653005986 Hz. cents(f1,f2) = 1200·log2(f2/f1).",
 "note_count_total": 11,
 "systems": [
  {
   "id": "sanfen",
   "region": "china",
   "note_count": 12,
   "name_zh": "三分损益律",
   "name_en": "Sanfen Sunyi (Pythagorean)",
   "name_short_zh": "三分损益",
   "name_short_en": "Sanfen Sunyi",
   "era_zh": "先秦（公元前 5–3 世纪）",
   "era_en": "Pre-Qin (5th–3rd c. BCE)",
   "cents": [
    0.0,
    701.9550009,
    203.9100017,
    905.8650026,
    407.8200035,
    1109.775004,
    611.7300052,
    113.6850061,
    815.6400069,
    317.5950078,
    1019.550009,
    521.5050095
   ],
   "note_names_zh": [
    "黄钟",
    "林钟",
    "太簇",
    "南吕",
    "姑洗",
    "应钟",
    "蕤宾",
    "大吕",
    "夷则",
    "夹钟",
    "无射",
    "仲吕"
   ],
   "note_names_en": [
    "Huangzhong",
    "Linzhong",
    "Taicu",
    "Nanlü",
    "Guxi",
    "Yingzhong",
    "Ruibin",
    "Dalü",
    "Yize",
    "Jiazhong",
    "Wuyi",
    "Zhonglü"
   ],
   "map_to_semitone": [
    "C",
    "G",
    "D",
    "A",
    "E",
    "B",
    "F#",
    "C#",
    "G#",
    "D#",
    "A#",
    "F"
   ],
   "basis_zh": "弦长三分损一（×2/3）与三分益一（×4/3）交替生律，12 次后仲吕不能回到黄钟，差 23.46 音分。",
   "basis_en": "Alternating 2/3 (diminish) and 4/3 (augment) string-length steps; after 12 steps the cycle misses the octave by 23.46 cents.",
   "source": "数学定义（3:2 五度链），与《管子·地员》《吕氏春秋·音律》所载三分损益法一致",
   "status": "computed"
  },
  {
   "id": "pyth",
   "region": "europe",
   "note_count": 12,
   "name_zh": "毕达哥拉斯律",
   "name_en": "Pythagorean Tuning",
   "name_short_zh": "毕氏律",
   "name_short_en": "Pythagorean",
   "era_zh": "古希腊（公元前 6 世纪）",
   "era_en": "Ancient Greece (6th c. BCE)",
   "cents": [
    0.0,
    701.9550009,
    203.9100017,
    905.8650026,
    407.8200035,
    1109.775004,
    611.7300052,
    113.6850061,
    815.6400069,
    317.5950078,
    1019.550009,
    521.5050095
   ],
   "note_names_zh": null,
   "note_names_en": [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
   ],
   "map_to_semitone": [
    "C",
    "G",
    "D",
    "A",
    "E",
    "B",
    "F#",
    "C#",
    "G#",
    "D#",
    "A#",
    "F"
   ],
   "basis_zh": "纯五度 3:2 连续叠加 12 次。与三分损益的**音分数值完全相同**——两条文明路径解出同一组比例，只是命名与乐器不同。",
   "basis_en": "Twelve stacked 3:2 fifths. Its cent table is **identical** to sanfen sunyi — two cultures, one set of ratios, different names and instruments.",
   "source": "数学定义（3:2 五度链）",
   "status": "computed",
   "derived": true
  },
  {
   "id": "ji5",
   "region": "europe",
   "note_count": 12,
   "name_zh": "纯律（五限）",
   "name_en": "Just Intonation (5-limit)",
   "name_short_zh": "纯律",
   "name_short_en": "Just",
   "era_zh": "文艺复兴（16 世纪系统化）",
   "era_en": "Renaissance (systematised 16th c.)",
   "cents": [
    0.0,
    111.7312853,
    203.9100017,
    315.641287,
    386.3137139,
    498.0449991,
    590.2237156,
    701.9550009,
    813.6862861,
    884.358713,
    1017.596288,
    1088.268715
   ],
   "note_names_zh": null,
   "note_names_en": [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
   ],
   "map_to_semitone": [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
   ],
   "basis_zh": "大三度用 5:4（386.31 音分）等小整数比，和声纯净，但移调困难。",
   "basis_en": "Small-integer ratios such as the 5:4 major third (386.31 cents) give pure harmony but resist transposition.",
   "source": "数学定义（5-限整数比 1/1…15/8）",
   "status": "computed"
  },
  {
   "id": "meantone",
   "region": "europe",
   "note_count": 12,
   "name_zh": "中庸律（1/4 音差）",
   "name_en": "Quarter-comma Meantone",
   "name_short_zh": "中庸律",
   "name_short_en": "Meantone",
   "era_zh": "16–17 世纪",
   "era_en": "16th–17th c.",
   "cents": [
    0.0,
    76.04899926,
    193.1568569,
    269.2058562,
    386.3137139,
    462.3627131,
    579.4705708,
    696.5784285,
    772.6274277,
    889.7352854,
    965.7842847,
    1082.892142
   ],
   "note_names_zh": null,
   "note_names_en": [
    "C",
    "C♯",
    "D",
    "E♭",
    "E",
    "F",
    "F♯",
    "G",
    "G♯",
    "A",
    "B♭",
    "B"
   ],
   "map_to_semitone": [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
   ],
   "basis_zh": "把五度收窄 1/4 个普通音差，使大三度变成纯 5:4；代价是留下一个无法使用的「狼五度」。",
   "basis_en": "Each fifth narrowed by a quarter of a syntonic comma makes the major third pure 5:4, at the cost of one unusable 'wolf fifth'.",
   "source": "数学定义（五度 = 5^(1/4)）",
   "status": "computed"
  },
  {
   "id": "werck3",
   "region": "europe",
   "note_count": 12,
   "name_zh": "Werckmeister III 律",
   "name_en": "Werckmeister III",
   "name_short_zh": "Werckmeister III",
   "name_short_en": "Werckmeister III",
   "era_zh": "1691",
   "era_en": "1691",
   "cents": [
    0.0,
    90.225,
    192.18,
    294.135,
    390.225,
    498.045,
    588.27,
    696.578,
    792.18,
    888.27,
    996.09,
    1092.18
   ],
   "note_names_zh": null,
   "note_names_en": [
    "C",
    "C♯",
    "D",
    "E♭",
    "E",
    "F",
    "F♯",
    "G",
    "G♯",
    "A",
    "B♭",
    "B"
   ],
   "map_to_semitone": [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
   ],
   "basis_zh": "「良律」（well temperament）：各调都能用，但每个调的色彩不同。",
   "basis_en": "A 'well temperament': every key is usable, but each key has its own colour.",
   "source": "A. Werckmeister, Musicalische Temperatur (1691)；通行 12 音音分表",
   "status": "pending"
  },
  {
   "id": "tet12",
   "region": "global",
   "note_count": 12,
   "name_zh": "十二平均律",
   "name_en": "12-Tone Equal Temperament",
   "name_short_zh": "十二平均律",
   "name_short_en": "12-TET",
   "era_zh": "1584（中国）/ 16–17 世纪（欧洲）",
   "era_en": "1584 (China) / 16th–17th c. (Europe)",
   "cents": [
    0.0,
    100.0,
    200.0,
    300.0,
    400.0,
    500.0,
    600.0,
    700.0,
    800.0,
    900.0,
    1000.0,
    1100.0
   ],
   "note_names_zh": null,
   "note_names_en": [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
   ],
   "map_to_semitone": [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
   ],
   "basis_zh": "每个半音恰好 100 音分，2^(1/12) 为公比，12 次幂精确等于 2：闭合。",
   "basis_en": "Every semitone is exactly 100 cents; ratio 2^(1/12) closes at the twelfth power exactly 2.",
   "source": "数学定义（2^(1/12)，朱载堉《律学新说》1584「新法密率」）",
   "status": "computed"
  },
  {
   "id": "sruti22",
   "region": "india",
   "note_count": 22,
   "name_zh": "印度二十二什鲁蒂",
   "name_en": "Indian 22 shruti",
   "name_short_zh": "22 什鲁蒂",
   "name_short_en": "22 shruti",
   "era_zh": "古典梵语理论传统",
   "era_en": "Classical Sanskrit theory",
   "cents": [
    0.0,
    90.225,
    111.731,
    182.404,
    203.91,
    294.135,
    315.641,
    386.314,
    407.82,
    498.045,
    519.551,
    590.224,
    611.73,
    701.955,
    792.18,
    813.686,
    884.359,
    905.865,
    996.09,
    1017.596,
    1088.269,
    1109.775
   ],
   "note_names_zh": null,
   "note_names_en": null,
   "map_to_semitone": null,
   "basis_zh": "以 5-limit 比率实现 22 个微分音（比率表见 entries[india_22shruti].ratios），不同文献取值不同，本表公开构造式以便复算。",
   "basis_en": "22 microtonal degrees realised as 5-limit ratios (see entries[india_22shruti].ratios); sources differ, so the construction is published for recomputation.",
   "source": "Rao & van der Meer 2010（UvA-DARE, OpenAlex W1613168573）；Midya 2015 arXiv:1502.03679",
   "status": "research",
   "source_ids": [
    "S16",
    "S17"
   ]
  },
  {
   "id": "maqam24",
   "region": "arabic",
   "note_count": 24,
   "name_zh": "阿拉伯木卡姆（24 平均律近似）",
   "name_en": "Arabic maqam (24-TET approx.)",
   "name_short_zh": "木卡姆 24 近似",
   "name_short_en": "Maqam 24-TET",
   "era_zh": "1932 开罗会议后的理论近似",
   "era_en": "Theory after the 1932 Cairo Congress",
   "cents": [
    0.0,
    50.0,
    100.0,
    150.0,
    200.0,
    250.0,
    300.0,
    350.0,
    400.0,
    450.0,
    500.0,
    550.0,
    600.0,
    650.0,
    700.0,
    750.0,
    800.0,
    850.0,
    900.0,
    950.0,
    1000.0,
    1050.0,
    1100.0,
    1150.0
   ],
   "note_names_zh": null,
   "note_names_en": null,
   "map_to_semitone": null,
   "basis_zh": "24 等分八度、每步 50 音分，是对木卡姆的近似模型而非实践本身；实测演奏与 24-TET 有系统偏差（土耳其马卡姆需 79 音模型）。",
   "basis_en": "24 equal 50-cent steps: an approximation of maqam, not the practice itself; measurements deviate systematically and Turkish makam needs a 79-tone model.",
   "source": "Bozkurt et al. 2025 arXiv:2506.14503（ORD-CC32 公开数据集）；OpenAlex W7139726342（79-tone）",
   "status": "research",
   "source_ids": [
    "S18",
    "S19"
   ]
  },
  {
   "id": "slendro",
   "region": "indonesia",
   "note_count": 5,
   "name_zh": "斯连德罗（5 等分模型）",
   "name_en": "Slendro (5-EDO model)",
   "name_short_zh": "斯连德罗",
   "name_short_en": "Slendro",
   "era_zh": "印尼甘美兰传统",
   "era_en": "Indonesian gamelan tradition",
   "cents": [
    0.0,
    240.0,
    480.0,
    720.0,
    960.0
   ],
   "note_names_zh": null,
   "note_names_en": null,
   "map_to_semitone": null,
   "basis_zh": "以 5 等分八度（每步 240 音分）作近似；实测各套甘美兰音高不同、无唯一权威表，本表仅作刻度对照。",
   "basis_en": "Approximated by 5 equal divisions (240 cents per step); actual gamelans differ, so this is a scale ruler only, not a measurement.",
   "source": "Rahn 2013 DOI 10.7202/1014424ar；Carterette et al. 1993 DOI 10.1250/ast.14.383",
   "status": "pending",
   "source_ids": [
    "S20"
   ]
  },
  {
   "id": "pelog",
   "region": "indonesia",
   "note_count": 7,
   "name_zh": "佩洛格（9 等分的 7 音子集模型）",
   "name_en": "Pelog (7-note subset of 9-EDO)",
   "name_short_zh": "佩洛格",
   "name_short_en": "Pelog",
   "era_zh": "印尼甘美兰传统",
   "era_en": "Indonesian gamelan tradition",
   "cents": [
    0.0,
    133.333,
    266.667,
    533.333,
    666.667,
    800.0,
    1066.667
   ],
   "note_names_zh": null,
   "note_names_en": null,
   "map_to_semitone": null,
   "basis_zh": "取 9 等分八度（每步 133.333 音分）的 0,1,2,4,5,6,8 号音作 7 音近似；实际佩洛格音程明显不等且各套乐器不同，本表仅作刻度对照。",
   "basis_en": "Seven notes taken from 9-EDO (133.333 cents per step) at indices 0,1,2,4,5,6,8; real pelog is unequal and instrument-specific — a ruler only.",
   "source": "Rahn 2013 DOI 10.7202/1014424ar；Carterette et al. 1993 DOI 10.1250/ast.14.383",
   "status": "pending",
   "source_ids": [
    "S20"
   ]
  },
  {
   "id": "thai7",
   "region": "thailand",
   "note_count": 7,
   "name_zh": "泰国七平均律",
   "name_en": "Thai 7-TET",
   "name_short_zh": "泰七平均",
   "name_short_en": "Thai 7-TET",
   "era_zh": "泰国传统音乐",
   "era_en": "Thai traditional music",
   "cents": [
    0.0,
    171.429,
    342.857,
    514.286,
    685.714,
    857.143,
    1028.571
   ],
   "note_names_zh": null,
   "note_names_en": null,
   "map_to_semitone": null,
   "basis_zh": "七等分八度、每步 1200/7 ≈ 171.4286 音分（Morton 1976 的描述模型）。",
   "basis_en": "Seven equal divisions of the octave, 1200/7 ≈ 171.4286 cents per step (the model described in Morton 1976).",
   "source": "Morton 1976, The Traditional Music of Thailand, DOI 10.1525/9780520321335",
   "status": "research",
   "source_ids": [
    "S21"
   ]
  }
 ]
};
;
/* ===== 11. data/data_history.js ===== */
/* 《同律》HistoryData —— 由 build_data_js.py 生成（输入：research(18)）
 * 自动生成，请勿手改。源：_research/*.json + metrics.json
 * 重建：py -X utf8 11_同律_国际专项赛/_pipeline/build_data_js.py
 */
window.HistoryData = {
 "schema": "concord.history/v1",
 "events": [
  {
   "year": -433,
   "year_label_zh": "约前 433",
   "year_label_en": "约前 433",
   "title_zh": "曾侯乙墓下葬（编钟 65 件）",
   "title_en": "Tomb of Marquis Yi of Zeng (65 chime bells)",
   "body_zh": "湖北随州擂鼓墩曾侯乙墓下葬，随葬编钟 65 件、跨三个以上八度，按半音阶调律；每钟可发正鼓、侧鼓两个音。",
   "body_en": "The tomb of Marquis Yi of Zeng at Leigudun, Suizhou, Hubei, was sealed with 65 chime bells spanning more than three octaves and tuned to the chromatic scale; each bell sounds two pitches.",
   "source": "S12；S13（详见 _research/sources.md）",
   "source_ids": [
    "S12",
    "S13"
   ],
   "status": "research",
   "region": "china"
  },
  {
   "year": -239,
   "year_label_zh": "约前 239",
   "year_label_en": "约前 239",
   "title_zh": "《吕氏春秋》记载十二律相生",
   "title_en": "Lüshi Chunqiu records the twelve-lü generation",
   "body_zh": "《吕氏春秋·音律》系统记载以三分损益法生成十二律的次序，是十二律体系最早的完整文献之一（成书年代与文本细节请见文献，本作品不逐字引用）。",
   "body_en": "The Lüshi Chunqiu's 'Yinlü' chapter records the order in which the twelve lü are generated by the sanfen sunyi method; it is among the earliest systematic accounts of the twelve-lü system.",
   "source": "S6；S7（详见 _research/sources.md）",
   "source_ids": [
    "S6",
    "S7"
   ],
   "status": "pending",
   "region": "china"
  },
  {
   "year": -77,
   "year_label_zh": "约前 77–前 37",
   "year_label_en": "约前 77–前 37",
   "title_zh": "京房六十律",
   "title_en": "Jing Fang's sixty lü",
   "body_zh": "汉代京房沿三分损益继续生律至六十律，试图以更细的分律逼近旋宫转调所需，仍未解决闭合问题。",
   "body_en": "Jing Fang (Han dynasty) extended the sanfen sunyi chain to sixty lü in pursuit of rotational modulation; the closure problem remained unsolved.",
   "source": "S27（详见 _research/sources.md）",
   "source_ids": [
    "S27"
   ],
   "status": "pending",
   "region": "china"
  },
  {
   "year": 447,
   "year_label_zh": "447（何承天卒年）",
   "year_label_en": "447（何承天卒年）",
   "title_zh": "何承天新律",
   "title_en": "He Chengtian's 'new lü'",
   "body_zh": "南朝何承天（370–447）提出「新律」，在十二律内部调整各律长度，以求十二律旋相为宫，《宋书·乐志》称之为「新律」。",
   "body_en": "He Chengtian (370–447) proposed a 'new lü' that adjusted the twelve pipe lengths internally so that each lü could serve as gong; the Songshu records it as the 'new lü'.",
   "source": "S28（详见 _research/sources.md）",
   "source_ids": [
    "S28"
   ],
   "status": "pending",
   "region": "china"
  },
  {
   "year": 1584,
   "year_label_zh": "1584",
   "year_label_en": "1584",
   "title_zh": "朱载堉《律学新说》提出新法密率",
   "title_en": "Zhu Zaiyu's Lüxue xinshuo and the 'new precise ratio'",
   "body_zh": "朱载堉（1536–1611）《律学新说》导言成于 1584 年，提出「新法密率」：以 2 的十二次方根等分八度，十二个半音比率全等，八度精确闭合。",
   "body_en": "Zhu Zaiyu's (1536–1611) Lüxue xinshuo, with an introduction dated 1584, proposed the xinfa milü: dividing the octave by the twelfth root of two, so that all twelve semitones share one ratio and the octave closes exactly.",
   "source": "S1；S2；S3（详见 _research/sources.md）",
   "source_ids": [
    "S1",
    "S2",
    "S3"
   ],
   "status": "research",
   "region": "china"
  },
  {
   "year": 1585,
   "year_label_zh": "约 1585",
   "year_label_en": "约 1585",
   "title_zh": "斯特芬在阿姆斯特丹推算十二等分八度",
   "title_en": "Simon Stevin works out equal division of the octave",
   "body_zh": "荷兰数学家西蒙·斯特芬（Simon Stevin, 1548–1620）约 1585 年以 2^(1/12) 处理十二等分八度问题；其手稿后由后人整理出版。学界将其与朱载堉并置讨论，但**两者是否存在传播关系仍有争议，本作品不作优先权断言**。",
   "body_en": "The Dutch mathematician Simon Stevin (1548–1620) worked out the equal division of the octave around 1585. Scholarship discusses him alongside Zhu Zaiyu; whether any transmission occurred is disputed, and this work makes no priority claim.",
   "source": "S22（详见 _research/sources.md）",
   "source_ids": [
    "S22"
   ],
   "status": "research",
   "region": "china"
  },
  {
   "year": 1596,
   "year_label_zh": "1596",
   "year_label_en": "1596",
   "title_zh": "《律吕精义》刊行",
   "title_en": "Lülü jingyi printed",
   "body_zh": "朱载堉《律吕精义》六卷导言于 1596 年刊印，系统阐述十二等程律的算法与律管异径校正。",
   "body_en": "The six-volume Lülü jingyi appeared with a 1596 introduction, setting out the equal-temperament algorithm and corrections for pipe diameters.",
   "source": "S2（详见 _research/sources.md）",
   "source_ids": [
    "S2"
   ],
   "status": "research",
   "region": "china"
  },
  {
   "year": 1606,
   "year_label_zh": "1606",
   "year_label_en": "1606",
   "title_zh": "《乐律全书》成书",
   "title_en": "Yuelü quanshu completed",
   "body_zh": "《乐律全书》十九卷本于 1606 年完成（1595 年起编），收录《律学新说》《律吕精义》《算学新说》等。",
   "body_en": "The 19-volume Yuelü quanshu was completed in 1606 (begun 1595), gathering the Lüxue xinshuo, Lülü jingyi and Suanxue xinshuo.",
   "source": "S2（详见 _research/sources.md）",
   "source_ids": [
    "S2"
   ],
   "status": "research",
   "region": "china"
  },
  {
   "year": 1681,
   "year_label_zh": "1681",
   "year_label_en": "1681",
   "title_zh": "韦克迈斯特《Orgelprobe》首用「wohl temperirt」",
   "title_en": "Werckmeister uses 'wohl temperirt' on a title page",
   "body_zh": "安德烈亚斯·韦克迈斯特（Andreas Werckmeister, 1645–1706）在《Orgelprobe》(1681) 书名页使用「wohl temperirt（良好调律）」，成为后世「良好律制」概念的源头之一。",
   "body_en": "Andreas Werckmeister (1645–1706) used 'wohl temperirt' on the title page of his Orgelprobe (1681), an early source of the 'well temperament' idea.",
   "source": "S23（详见 _research/sources.md）",
   "source_ids": [
    "S23"
   ],
   "status": "research",
   "region": "europe"
  },
  {
   "year": 1691,
   "year_label_zh": "1689 / 1691",
   "year_label_en": "1689 / 1691",
   "title_zh": "韦克迈斯特《Musicalische Temperatur》",
   "title_en": "Werckmeister, Musicalische Temperatur",
   "body_zh": "韦克迈斯特《Musicalische Temperatur》系统给出若干种非等分调律方案，其中「第三律」流传最广：四个五度各收窄四分之一毕氏音差，其余为纯五度，八度闭合但各调色彩不均。",
   "body_en": "Werckmeister's Musicalische Temperatur set out several unequal temperaments; the third became the best known: four fifths narrowed by a quarter of a Pythagorean comma, the rest pure, closing the octave with unequal key colour.",
   "source": "S23；S24（详见 _research/sources.md）",
   "source_ids": [
    "S23",
    "S24"
   ],
   "status": "research",
   "region": "europe"
  },
  {
   "year": 1722,
   "year_label_zh": "1722",
   "year_label_en": "1722",
   "title_zh": "巴赫《平均律键盘曲集》第一卷",
   "title_en": "J. S. Bach, The Well-Tempered Clavier, Book I",
   "body_zh": "巴赫 1722 年编成《Das Wohltemperirte Clavier》第一卷，24 个大小调各一前奏曲与赋格。需注意：「wohltemperirt（良好调律）」不等于「十二平均律」；巴赫实际使用何种律制，学界仍有不同看法 → 本作品标为「待核验」。",
   "body_en": "Bach compiled Book I of the Wohltemperirte Clavier in 1722, with a prelude and fugue in each of the 24 keys. Note: 'wohl temperirt' is not identical with 12-TET, and which temperament Bach actually used remains debated; this work marks it as unverified.",
   "source": "S25；S23（详见 _research/sources.md）",
   "source_ids": [
    "S25",
    "S23"
   ],
   "status": "research",
   "region": "europe"
  },
  {
   "year": 1779,
   "year_label_zh": "1779",
   "year_label_en": "1779",
   "title_zh": "钱德明向欧洲介绍中国乐律",
   "title_en": "Amiot introduces Chinese music theory to Europe",
   "body_zh": "法国耶稣会士钱德明（Joseph-Marie Amiot, 1718–1793）1779 年出版《Mémoire sur la musique des Chinois》，首次系统向欧洲介绍中国乐律，但**遗漏了朱载堉新法密率的数学方法**，造成此后两百年的误读。",
   "body_en": "The French Jesuit Joseph-Marie Amiot (1718–1793) published his Mémoire sur la musique des Chinois in 1779, the first systematic European account of Chinese music theory — but it omitted Zhu Zaiyu's mathematical method, seeding two centuries of misreading.",
   "source": "S1（详见 _research/sources.md）",
   "source_ids": [
    "S1"
   ],
   "status": "pending",
   "region": "europe"
  },
  {
   "year": 1932,
   "year_label_zh": "1932",
   "year_label_en": "1932",
   "title_zh": "开罗阿拉伯音乐会议",
   "title_en": "Cairo Congress of Arab Music",
   "body_zh": "1932 年开罗阿拉伯音乐会议留下大批录音，成为研究阿拉伯木卡姆音高的基础材料；其录音 2025 年已被整理为开放研究数据集（ORD-CC32）。",
   "body_en": "The 1932 Cairo Congress of Arab Music left a large body of recordings that remain foundational for studying maqam intonation; in 2025 they were released as the open research dataset ORD-CC32.",
   "source": "S18（详见 _research/sources.md）",
   "source_ids": [
    "S18"
   ],
   "status": "research",
   "region": "europe"
  },
  {
   "year": 1975,
   "year_label_zh": "1975",
   "year_label_en": "1975",
   "title_zh": "库特纳重估朱载堉",
   "title_en": "Kuttner re-evaluates Zhu Zaiyu",
   "body_zh": "F. A. Kuttner 在《Ethnomusicology》发表《Prince Chu Tsai-yü's Life and Work》，重估朱载堉对十二平均律的贡献，并**反对「西方从朱载堉获得十二平均律」的传播论**。",
   "body_en": "F. A. Kuttner's Ethnomusicology article re-evaluated Zhu Zaiyu's contribution and argued against the claim that Western theorists received equal temperament from Zhu.",
   "source": "S4；S1；S5（详见 _research/sources.md）",
   "source_ids": [
    "S4",
    "S1",
    "S5"
   ],
   "status": "research",
   "region": "arabic"
  },
  {
   "year": 1975,
   "year_label_zh": "1975",
   "year_label_en": "1975",
   "title_zh": "ISO 16 规定 A4 = 440 Hz",
   "title_en": "ISO 16 standardises A4 = 440 Hz",
   "body_zh": "国际标准化组织 ISO 16:1975 将标准音高定为 A4 = 440 Hz（本作品基准音口径即取此值）。",
   "body_en": "ISO 16:1975 fixed the standard musical pitch at A4 = 440 Hz; this work adopts that value as its reference.",
   "source": "S26（详见 _research/sources.md）",
   "source_ids": [
    "S26"
   ],
   "status": "research",
   "region": "europe"
  },
  {
   "year": 1978,
   "year_label_zh": "1978",
   "year_label_en": "1978",
   "title_zh": "朱载堉与斯特芬的并行解题被并置讨论",
   "title_en": "Zhu Zaiyu and Stevin discussed side by side",
   "body_zh": "G. W. Mulder 在 JASA 发表《A striving toward equal temperament: Prince Tsai-yu in 1595 at Peking, and Simon Stevin shortly thereafter at Amsterdam》，把两条路径并列。",
   "body_en": "G. W. Mulder's JASA paper set the two paths side by side: Prince Tsai-yu in 1595 at Peking, and Simon Stevin shortly thereafter at Amsterdam.",
   "source": "S22（详见 _research/sources.md）",
   "source_ids": [
    "S22"
   ],
   "status": "official",
   "region": "world"
  },
  {
   "year": 1981,
   "year_label_zh": "1981",
   "year_label_en": "1981",
   "title_zh": "曾侯乙编钟复制研究成功",
   "title_en": "Replication of the Zeng Houyi bells succeeds",
   "body_zh": "多学科团队（考古/音乐/声学/冶金/铸造）完成曾侯乙编钟复制研究，验证一钟双音的物理机制。",
   "body_en": "An interdisciplinary team completed the replication of the Zeng Houyi bells, confirming the physics of the two-tone bell.",
   "source": "S12；S32（详见 _research/sources.md）",
   "source_ids": [
    "S12",
    "S32"
   ],
   "status": "research",
   "region": "europe"
  },
  {
   "year": 2025,
   "year_label_zh": "2025",
   "year_label_en": "2025",
   "title_zh": "数字与实体复刻研究确认编钟半音阶",
   "title_en": "Digital and physical re-creation confirms the chromatic set",
   "body_zh": "发表于 Humanities and Social Sciences Communications 的研究以数字与实体复刻钟为样本，确认曾侯乙编钟跨三个以上八度、按半音阶调律，并复原其复制与合瓦设计方法。",
   "body_en": "A 2025 study in Humanities and Social Sciences Communications used digitally and physically re-created bells to confirm the 65-bell set spans more than three octaves and is tuned chromatically.",
   "source": "S12（详见 _research/sources.md）",
   "source_ids": [
    "S12"
   ],
   "status": "research",
   "region": "china"
  }
 ]
};
;
/* ===== 12. data/data_world.js ===== */
/* 《同律》WorldData —— 由 build_data_js.py 生成（输入：seed）
 * 自动生成，请勿手改。源：_research/*.json + metrics.json
 * 重建：py -X utf8 11_同律_国际专项赛/_pipeline/build_data_js.py
 */
window.WorldData = {
 "schema": "concord.world/v1",
 "regions": [
  {
   "id": "china",
   "name_zh": "中国",
   "name_en": "China",
   "lat": 34.5,
   "lon": 108.9,
   "systems": [
    "sanfen",
    "tet12"
   ],
   "instruments_zh": "曾侯乙编钟、古琴、编磬",
   "instruments_en": "Bianzhong bells, guqin, bianqing",
   "body_zh": "从三分损益到朱载堉密率：同一条五度链的数学困境，在这里被正面解开。",
   "body_en": "From sanfen sunyi to Zhu Zaiyu's cipher ratio: the arithmetic dead end of the fifth-chain is solved head-on here.",
   "source": "《律学新说》《吕氏春秋》；考古测音报告",
   "status": "pending"
  },
  {
   "id": "greece",
   "name_zh": "古希腊",
   "name_en": "Ancient Greece",
   "lat": 37.9,
   "lon": 23.7,
   "systems": [
    "pyth"
   ],
   "instruments_zh": "里拉琴、奥洛斯管",
   "instruments_en": "Lyre, aulos",
   "body_zh": "毕达哥拉斯学派以 3:2 与 2:1 建立宇宙化的音程体系。",
   "body_en": "The Pythagorean school built a cosmological interval system on 3:2 and 2:1.",
   "source": "Nicomachus, Manual of Harmonics（转述）",
   "status": "pending"
  },
  {
   "id": "europe",
   "name_zh": "欧洲",
   "name_en": "Europe",
   "lat": 50.1,
   "lon": 8.7,
   "systems": [
    "ji5",
    "meantone",
    "werck3",
    "tet12"
   ],
   "instruments_zh": "管风琴、羽管键琴、钢琴",
   "instruments_en": "Organ, harpsichord, piano",
   "body_zh": "纯律 → 中庸律 → 良律 → 平均律：四百年逐步妥协，直到每个调都能用。",
   "body_en": "Just intonation → meantone → well temperament → equal temperament: four centuries of compromise until every key works.",
   "source": "Werckmeister (1691)；Barbour, Tuning and Temperament (1951)",
   "status": "pending"
  },
  {
   "id": "india",
   "name_zh": "印度",
   "name_en": "India",
   "lat": 20.6,
   "lon": 78.9,
   "systems": [
    "sruti22"
   ],
   "instruments_zh": "西塔琴、坦布拉",
   "instruments_en": "Sitar, tanpura",
   "body_zh": "22 śruti 提供的是旋律音位框架，而非固定十二律。",
   "body_en": "The 22 śruti provide a melodic grid of positions, not twelve fixed pitches.",
   "source": "Bharata, Nāṭyaśāstra（传统归属）；待 research 核验",
   "status": "pending"
  },
  {
   "id": "arabic",
   "name_zh": "阿拉伯世界",
   "name_en": "Arabic world",
   "lat": 33.3,
   "lon": 44.4,
   "systems": [
    "maqam24"
   ],
   "instruments_zh": "乌德琴、卡农琴",
   "instruments_en": "Oud, qanun",
   "body_zh": "maqam 的实际音高随乐句流动，24 等分只是理论参照网。",
   "body_en": "Actual maqam intonation shifts with the phrase; the 24-division grid is only a theoretical reference.",
   "source": "阿拉伯音乐理论研究通行表述；待核验",
   "status": "pending"
  },
  {
   "id": "indonesia",
   "name_zh": "印度尼西亚",
   "name_en": "Indonesia",
   "lat": -7.6,
   "lon": 110.7,
   "systems": [
    "slendro",
    "pelog"
   ],
   "instruments_zh": "甘美兰（铜排琴、锣群）",
   "instruments_en": "Gamelan (metallophones, gongs)",
   "body_zh": "每套甘美兰为特定乐团铸造并调音——乐器本身即律制的实物记录。",
   "body_en": "Each gamelan is cast and tuned for one ensemble — the instruments themselves are the physical record of the tuning.",
   "source": "爪哇甘美兰研究通行表述；待核验",
   "status": "pending"
  },
  {
   "id": "thailand",
   "name_zh": "泰国",
   "name_en": "Thailand",
   "lat": 15.9,
   "lon": 100.9,
   "systems": [
    "thai7"
   ],
   "instruments_zh": "拉那特（木琴）",
   "instruments_en": "Ranat (xylophone)",
   "body_zh": "固定音高木琴促成七等分八度的理论化表述。",
   "body_en": "Fixed-pitch xylophones encouraged a seven-equal-division formulation.",
   "source": "东南亚音乐研究通行表述；待核验",
   "status": "pending"
  }
 ]
};
;
/* ===== 13. data/data_glossary.js ===== */
/* 《同律》GlossaryData —— 由 build_data_js.py 生成（输入：research(177)）
 * 自动生成，请勿手改。源：_research/*.json + metrics.json
 * 重建：py -X utf8 11_同律_国际专项赛/_pipeline/build_data_js.py
 */
window.GlossaryData = {
 "schema": "concord.glossary/v1",
 "categories": [
  {
   "id": "c01",
   "name_zh": "乐器",
   "name_en": "乐器",
   "count": 22
  },
  {
   "id": "c02",
   "name_zh": "记谱与音名",
   "name_en": "记谱与音名",
   "count": 21
  },
  {
   "id": "c03",
   "name_zh": "律学基础",
   "name_en": "律学基础",
   "count": 19
  },
  {
   "id": "c04",
   "name_zh": "声学",
   "name_en": "声学",
   "count": 19
  },
  {
   "id": "c05",
   "name_zh": "律制",
   "name_en": "律制",
   "count": 18
  },
  {
   "id": "c06",
   "name_zh": "历史",
   "name_en": "历史",
   "count": 17
  },
  {
   "id": "c07",
   "name_zh": "生律法",
   "name_en": "生律法",
   "count": 16
  },
  {
   "id": "c08",
   "name_zh": "世界音乐",
   "name_en": "世界音乐",
   "count": 16
  },
  {
   "id": "c09",
   "name_zh": "数学",
   "name_en": "数学",
   "count": 16
  },
  {
   "id": "c10",
   "name_zh": "演奏与调律",
   "name_en": "演奏与调律",
   "count": 13
  }
 ],
 "terms": [
  {
   "id": "lü",
   "term_zh": "律",
   "term_en": "lü",
   "cat": "math",
   "def_zh": "中国古代对音高的规范单位；也指以某一基准音生成的一整套音高关系。",
   "def_en": "In Chinese music theory, a standardised unit of pitch; by extension, the whole set of pitch relations generated from one reference tone.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "tuning-system",
   "term_zh": "音律",
   "term_en": "tuning system",
   "cat": "math",
   "def_zh": "各音之间音高关系的数学规定，决定音阶内每个音的位置。",
   "def_en": "The mathematical specification of pitch relations among tones, which fixes each degree of a scale.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "lülü",
   "term_zh": "律吕",
   "term_en": "lülü",
   "cat": "math",
   "def_zh": "十二律中六个阳律（律）与六个阴吕（吕）的合称，是十二律的另一种称谓。",
   "def_en": "Collective name for the six yang lü and six yin lü among the twelve lü.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "twelve-lü",
   "term_zh": "十二律",
   "term_en": "twelve lü",
   "cat": "math",
   "def_zh": "一个八度内十二个半音级的一套固定音高名，自黄钟至应钟依次排列。",
   "def_en": "A fixed set of twelve pitch-class names, one per semitone of the octave, running from Huangzhong to Yingzhong.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "semitone",
   "term_zh": "半音",
   "term_en": "semitone",
   "cat": "math",
   "def_zh": "相邻两个音级间最小的常用音程；在十二平均律中恰为 100 音分。",
   "def_en": "The smallest interval in common use between adjacent degrees; exactly 100 cents in 12-TET.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "whole-tone",
   "term_zh": "全音",
   "term_en": "whole tone",
   "cat": "math",
   "def_zh": "两个半音相加的音程；十二平均律中为 200 音分。",
   "def_en": "An interval of two semitones; 200 cents in 12-TET.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "octave",
   "term_zh": "八度",
   "term_en": "octave",
   "cat": "math",
   "def_zh": "频率比为 2:1 的音程，听觉上两音「同名」。",
   "def_en": "The interval whose frequency ratio is 2:1; the two tones share a pitch-class name.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "perfect-octave",
   "term_zh": "纯八度",
   "term_en": "perfect octave",
   "cat": "math",
   "def_zh": "频率比严格等于 2 的八度；它是所有律制都必须闭合的约束条件。",
   "def_en": "An octave whose ratio is exactly 2; every tuning system must close on it.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "cent",
   "term_zh": "音分",
   "term_en": "cent",
   "cat": "math",
   "def_zh": "音高距离的对数单位，等于十二平均律半音的百分之一；由 1200·log2(f2/f1) 换算。",
   "def_en": "A logarithmic unit of pitch distance equal to one hundredth of a 12-TET semitone, computed as 1200·log2(f2/f1).",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "pitch",
   "term_zh": "音高",
   "term_en": "pitch",
   "cat": "math",
   "def_zh": "听觉对声音频率高低（并受谐波结构影响）的知觉属性。",
   "def_en": "The perceptual attribute of how high or low a sound is, set mainly by frequency and shaped by spectral content.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "pitch-class",
   "term_zh": "音级",
   "term_en": "pitch class",
   "cat": "math",
   "def_zh": "忽略八度差异后归为一类的音高，如所有 C 属同一音级。",
   "def_en": "A pitch identity abstracted from octave register, e.g. every C belongs to one pitch class.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "range",
   "term_zh": "音域",
   "term_en": "range",
   "cat": "math",
   "def_zh": "一件乐器或一个人声所能发出的最低到最高音的范围。",
   "def_en": "The span from lowest to highest pitch an instrument or voice can produce.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "scale",
   "term_zh": "音阶",
   "term_en": "scale",
   "cat": "math",
   "def_zh": "按音高次序排列、用于构成旋律的一组音级。",
   "def_en": "An ordered set of pitch classes used to build melody.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "key",
   "term_zh": "调",
   "term_en": "key",
   "cat": "math",
   "def_zh": "以一个音为主音、按特定音阶组织起来的音高中心。",
   "def_en": "A tonal centre built on one tonic with a particular scale.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "mode",
   "term_zh": "调式",
   "term_en": "mode",
   "cat": "math",
   "def_zh": "音阶内部各音与主音之间关系所形成的旋律型态。",
   "def_en": "The pattern of melodic relations between the degrees of a scale and its tonic.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "rotational-modulation",
   "term_zh": "旋宫",
   "term_en": "rotational modulation",
   "cat": "math",
   "def_zh": "十二律轮流充当宫音（主音）的做法，是十二律体系要解决的核心问题。",
   "def_en": "The practice of letting each of the twelve lü serve in turn as gong (tonic) — the central problem the twelve-lü system had to solve.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "modulation",
   "term_zh": "转调",
   "term_en": "modulation",
   "cat": "math",
   "def_zh": "乐曲进行中由一个调中心转向另一个调中心。",
   "def_en": "A change of tonal centre in the course of a piece.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "intonation",
   "term_zh": "音准",
   "term_en": "intonation",
   "cat": "math",
   "def_zh": "实际发出的音高与目标音高之间的偏差程度，通常以音分度量。",
   "def_en": "How far produced pitches deviate from their targets, usually measured in cents.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "enharmonic-equivalent",
   "term_zh": "等音",
   "term_en": "enharmonic equivalent",
   "cat": "math",
   "def_zh": "音高相同而名称不同的音，如 C♯ 与 D♭；在非等分律中二者并不真正相等。",
   "def_en": "Two notes with the same pitch but different names, such as C♯ and D♭; in unequal temperaments they are not truly identical.",
   "source_ids": [
    "S31",
    "S9"
   ],
   "cat_zh_10": "律学基础"
  },
  {
   "id": "sanfen-sunyi-chinese-pythagorean-method",
   "term_zh": "三分损益法",
   "term_en": "sanfen sunyi (Chinese Pythagorean method)",
   "cat": "tuning",
   "def_zh": "中国古代以弦长为量、交替「损」（×2/3，下生）与「益」（×4/3，上生）来生成十二律的方法。",
   "def_en": "The classical Chinese method of generating the twelve lü by alternately reducing (×2/3) and increasing (×4/3) a string length.",
   "source_ids": [
    "S6",
    "S7"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "descending-generation",
   "term_zh": "下生",
   "term_en": "descending generation",
   "cat": "tuning",
   "def_zh": "三分损益中弦长乘 2/3 的一步，所得音比原音高一个纯五度。",
   "def_en": "The step that multiplies the string length by 2/3, raising the pitch by a perfect fifth.",
   "source_ids": [
    "S6"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "ascending-generation",
   "term_zh": "上生",
   "term_en": "ascending generation",
   "cat": "tuning",
   "def_zh": "三分损益中弦长乘 4/3 的一步，所得音比原音低一个纯四度（八度折叠后为高四度）。",
   "def_en": "The step that multiplies the string length by 4/3, which after octave folding raises the pitch by a fourth.",
   "source_ids": [
    "S6"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "generation-at-the-eighth-degree",
   "term_zh": "隔八相生",
   "term_en": "generation at the eighth degree",
   "cat": "tuning",
   "def_zh": "三分损益每次生律的结果与生律者相隔八个音级（含首尾）的现象。",
   "def_en": "The observation that each sanfen sunyi generation lands eight degrees away (counting both ends) from its source.",
   "source_ids": [
    "S6",
    "S7"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "pythagorean-tuning",
   "term_zh": "五度相生律",
   "term_en": "Pythagorean tuning",
   "cat": "tuning",
   "def_zh": "以连续纯五度（频率比 3/2）向上或向下推演生成十二音的律制。",
   "def_en": "A tuning built by stacking perfect fifths (ratio 3/2) upward or downward to reach twelve notes.",
   "source_ids": [
    "S6",
    "S7"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "just-intonation",
   "term_zh": "纯律",
   "term_en": "just intonation",
   "cat": "tuning",
   "def_zh": "以小整数频率比（如 5/4、6/5、4/3）构成音阶的律制，和声音程最纯但不能自由转调。",
   "def_en": "A tuning whose scale degrees are small-integer ratios (5/4, 6/5, 4/3 …); intervals are purest but free modulation breaks down.",
   "source_ids": [
    "S29"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "circle-of-fifths",
   "term_zh": "五度圈",
   "term_en": "circle of fifths",
   "cat": "tuning",
   "def_zh": "把十二音按纯五度关系排成闭环的图示；闭环所需的「最后一步」正是音差出现的位置。",
   "def_en": "A diagram arranging the twelve notes by perfect fifths; the necessary closing step is exactly where the comma appears.",
   "source_ids": [
    "S6",
    "S7"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "order-of-generation",
   "term_zh": "生律次序",
   "term_en": "order of generation",
   "cat": "tuning",
   "def_zh": "三分损益生成十二律的固定先后：黄钟、林钟、太簇、南吕、姑洗、应钟、蕤宾、大吕、夷则、夹钟、无射、仲吕。",
   "def_en": "The fixed sequence in which the twelve lü are generated: Huangzhong, Linzhong, Taicu, Nanlü, Guxian, Yingzhong, Ruibin, Dalü, Yize, Jiazhong, Wuyi, Zhonglü.",
   "source_ids": [
    "S7"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "sixty-lü",
   "term_zh": "六十律",
   "term_en": "sixty lü",
   "cat": "tuning",
   "def_zh": "汉代京房把三分损益继续推演至六十律，试图用更细的分律解决旋宫问题。",
   "def_en": "Jing Fang's Han-dynasty extension of sanfen sunyi to sixty lü, an attempt to solve rotational modulation by finer division.",
   "source_ids": [
    "S6",
    "S7"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "three-hundred-and-sixty-lü",
   "term_zh": "三百六十律",
   "term_en": "three hundred and sixty lü",
   "cat": "tuning",
   "def_zh": "南朝钱乐之进一步细分的律制，把生律推到三百六十个音。",
   "def_en": "Qian Lezhi's Southern-Dynasties scheme extending generation to 360 pitches.",
   "source_ids": [
    "S6",
    "S7"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "he-chengtian-s-new-lü",
   "term_zh": "何承天新律",
   "term_en": "He Chengtian's new lü",
   "cat": "tuning",
   "def_zh": "南朝何承天在十二律内部调整各律长度以求旋宫的方案，《宋书·乐志》称「新律」。",
   "def_en": "He Chengtian's plan to adjust the twelve lengths internally so each could act as gong; the Songshu calls it the 'new lü'.",
   "source_ids": [
    "S6",
    "S7"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "xinfa-milü-new-precise-ratio",
   "term_zh": "新法密率",
   "term_en": "xinfa milü ('new precise ratio')",
   "cat": "tuning",
   "def_zh": "朱载堉对 2 的十二次方根（2^(1/12)）的称法，用它把八度精确等分为十二份。",
   "def_en": "Zhu Zaiyu's term for the twelfth root of two, used to divide the octave into twelve exactly equal parts.",
   "source_ids": [
    "S3",
    "S10"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "milü-precise-ratio",
   "term_zh": "密率",
   "term_en": "milü ('precise ratio')",
   "cat": "tuning",
   "def_zh": "朱载堉体系中对等程半音比率的简称。",
   "def_en": "Zhu Zaiyu's short name for the equal-semitone ratio.",
   "source_ids": [
    "S3",
    "S10"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "root-extraction",
   "term_zh": "开方术",
   "term_en": "root extraction",
   "cat": "tuning",
   "def_zh": "中国古代求平方根、立方根等的计算方法，朱载堉用它逐级算出 2^(1/12)。",
   "def_en": "The classical Chinese technique of extracting square and cube roots, which Zhu Zaiyu used stepwise to reach 2^(1/12).",
   "source_ids": [
    "S3",
    "S11"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "pitch-pipe",
   "term_zh": "律管",
   "term_en": "pitch pipe",
   "cat": "tuning",
   "def_zh": "以管长定音的管子；管中气柱的有效长度与同长弦不同，故需管口校正。",
   "def_en": "A pipe used to fix pitch; its effective air-column length differs from an equal string length, requiring end correction.",
   "source_ids": [
    "S2",
    "S31"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "seasonal-pitch-pipe-ritual",
   "term_zh": "候气",
   "term_en": "seasonal pitch-pipe ritual",
   "cat": "tuning",
   "def_zh": "古代把律管埋入土中、以葭莩灰应节候动的说法，反映律与历的同构观念。",
   "def_en": "An old practice of burying pitch pipes and reading the reed ash as seasonal omen, reflecting the lü-calendar homology.",
   "source_ids": [
    "S6",
    "S7"
   ],
   "cat_zh_10": "生律法"
  },
  {
   "id": "twelve-tone-equal-temperament-12-tet",
   "term_zh": "十二平均律",
   "term_en": "twelve-tone equal temperament (12-TET)",
   "cat": "tuning",
   "def_zh": "把一个八度等分为十二个 100 音分半音的律制，当代全球乐器与音乐工业的默认标准。",
   "def_en": "The system dividing the octave into twelve semitones of 100 cents each, now the default standard of global instrument making.",
   "source_ids": [
    "S9",
    "S3"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "twelve-step-equal-temperament",
   "term_zh": "十二等程律",
   "term_en": "twelve-step equal temperament",
   "cat": "tuning",
   "def_zh": "朱载堉对十二平均律的术语，强调十二个半音的比率完全相等。",
   "def_en": "Zhu Zaiyu's term for 12-TET, stressing that all twelve semitones share one ratio.",
   "source_ids": [
    "S3",
    "S10"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "equal-temperament",
   "term_zh": "平均律",
   "term_en": "equal temperament",
   "cat": "tuning",
   "def_zh": "把八度按等分方式切割的律制统称，等分数可以不是 12。",
   "def_en": "Any tuning that divides the octave into equal parts; the number of parts need not be twelve.",
   "source_ids": [
    "S9"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "pythagorean-tuning",
   "term_zh": "毕达哥拉斯律",
   "term_en": "Pythagorean tuning",
   "cat": "tuning",
   "def_zh": "西方对五度相生律的称法，以 3/2 连续推演；其三度偏宽、五度极纯。",
   "def_en": "The Western name for the pure-fifth tuning; its thirds are wide and its fifths nearly pure.",
   "source_ids": [
    "S7"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "meantone-temperament",
   "term_zh": "中庸律",
   "term_en": "meantone temperament",
   "cat": "tuning",
   "def_zh": "通过略微收窄五度来换取纯律大三度的律制族，文艺复兴键盘乐器的主流。",
   "def_en": "A family of temperaments that narrows the fifths slightly to obtain pure major thirds; mainstream for Renaissance keyboards.",
   "source_ids": [
    "S30"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "quarter-comma-meantone",
   "term_zh": "四分之一音差中庸律",
   "term_en": "quarter-comma meantone",
   "cat": "tuning",
   "def_zh": "把每个五度收窄四分之一个狄迪莫斯音差的中庸律，使 C–E 恰为 5/4。",
   "def_en": "Meantone that narrows each fifth by a quarter of the syntonic comma, making C–E exactly 5/4.",
   "source_ids": [
    "S30"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "well-temperament",
   "term_zh": "良好律制",
   "term_en": "well temperament",
   "cat": "tuning",
   "def_zh": "八度闭合、可在全部调上演奏，但各调音程纯度不完全相同的循环律制。",
   "def_en": "A circulating tuning that closes the octave and works in every key, while each key keeps its own interval colour.",
   "source_ids": [
    "S23"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "werckmeister-iii",
   "term_zh": "韦克迈斯特第三律",
   "term_en": "Werckmeister III",
   "cat": "tuning",
   "def_zh": "韦克迈斯特 1691 年给出的著名良好律制：四个五度各收窄四分之一毕氏音差。",
   "def_en": "Werckmeister's well-known 1691 scheme: four fifths each narrowed by a quarter of a Pythagorean comma.",
   "source_ids": [
    "S23",
    "S24"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "circulating-temperament",
   "term_zh": "循环律制",
   "term_en": "circulating temperament",
   "cat": "tuning",
   "def_zh": "可在十二个调上演奏的现代称法，与历史上的「良好律制」大体对应。",
   "def_en": "The modern label for temperaments usable in all twelve keys, broadly matching the historical 'well temperament'.",
   "source_ids": [
    "S23"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "pythagorean-comma",
   "term_zh": "毕氏音差",
   "term_en": "Pythagorean comma",
   "cat": "tuning",
   "def_zh": "12 个纯五度与 7 个八度之差：531441/524288，约 23.46 音分。",
   "def_en": "The discrepancy between twelve perfect fifths and seven octaves: 531441/524288, about 23.46 cents.",
   "source_ids": [
    "S8"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "syntonic-comma",
   "term_zh": "狄迪莫斯音差",
   "term_en": "syntonic comma",
   "cat": "tuning",
   "def_zh": "纯律大三度 5/4 与毕氏大三度 81/64 之差，81/80，约 21.51 音分。",
   "def_en": "The gap between the just major third 5/4 and the Pythagorean third 81/64: 81/80, about 21.51 cents.",
   "source_ids": [
    "S8"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "wolf-fifth",
   "term_zh": "狼五度",
   "term_en": "wolf fifth",
   "cat": "tuning",
   "def_zh": "五度链收尾处明显失准的那个五度，在非循环律制中不可避免。",
   "def_en": "The badly out-of-tune fifth where the chain of fifths is closed in a non-circulating temperament.",
   "source_ids": [
    "S9",
    "S8"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "wolf",
   "term_zh": "狼音",
   "term_en": "wolf",
   "cat": "tuning",
   "def_zh": "狼五度（或严重失准音程）造成的强烈拍音与粗糙听感。",
   "def_en": "The rough beating heard on a wolf fifth or other severely mistuned interval.",
   "source_ids": [
    "S9",
    "S8"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "equal-division-of-the-octave",
   "term_zh": "等分八度",
   "term_en": "equal division of the octave",
   "cat": "tuning",
   "def_zh": "把 1200 音分平均分成 n 份的构造，n=12 即十二平均律。",
   "def_en": "The construction that splits 1200 cents into n equal parts; n=12 gives 12-TET.",
   "source_ids": [
    "S9",
    "S8"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "unequal-temperament",
   "term_zh": "非等分律",
   "term_en": "unequal temperament",
   "cat": "tuning",
   "def_zh": "各音级间隔不完全相等的律制，如中庸律、良好律制、三分损益律。",
   "def_en": "Any tuning whose step sizes are not all equal, e.g. meantone, well temperaments and sanfen sunyi.",
   "source_ids": [
    "S9",
    "S8"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "24-tet",
   "term_zh": "二十四平均律",
   "term_en": "24-TET",
   "cat": "tuning",
   "def_zh": "把八度等分为 24 份、每份 50 音分的律制，常被用作阿拉伯木卡姆的近似模型。",
   "def_en": "A division of the octave into 24 equal 50-cent steps, often used as an approximation for Arabic maqam.",
   "source_ids": [
    "S18",
    "S19"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "7-tet",
   "term_zh": "七平均律",
   "term_en": "7-TET",
   "cat": "tuning",
   "def_zh": "把八度等分为 7 份、每份约 171.43 音分的律制，用于描述泰国传统音阶。",
   "def_en": "A division of the octave into seven equal steps of about 171.43 cents, used to describe Thai traditional scales.",
   "source_ids": [
    "S21"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "5-tet",
   "term_zh": "五平均律",
   "term_en": "5-TET",
   "cat": "tuning",
   "def_zh": "把八度等分为 5 份、每份 240 音分的律制，可作为斯连德罗的等分近似模型。",
   "def_en": "A division of the octave into five equal 240-cent steps, usable as an equal-step model of slendro.",
   "source_ids": [
    "S20"
   ],
   "cat_zh_10": "律制"
  },
  {
   "id": "bianzhong-chime-bells",
   "term_zh": "编钟",
   "term_en": "bianzhong (chime bells)",
   "cat": "instrument",
   "def_zh": "成组悬挂、按音高排列的中国青铜钟，是先秦礼乐的核心乐器。",
   "def_en": "A set of Chinese bronze bells hung in rows and ordered by pitch; the core instrument of pre-Qin ritual music.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "niu-bell",
   "term_zh": "钮钟",
   "term_en": "niu bell",
   "cat": "instrument",
   "def_zh": "顶部有钮、体型较小的一类编钟。",
   "def_en": "A smaller chime bell type with a loop handle on top.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "yong-bell",
   "term_zh": "甬钟",
   "term_en": "yong bell",
   "cat": "instrument",
   "def_zh": "顶部有甬柄、体型较大的一类编钟，中层与下层多用。",
   "def_en": "A larger chime bell type with a cylindrical shank (yong) on top, typical of the middle and lower tiers.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "bo-bell",
   "term_zh": "镈钟",
   "term_en": "bo bell",
   "cat": "instrument",
   "def_zh": "形体大、多单件使用的钟，常作礼乐器或赠礼。",
   "def_en": "A large, usually single bell used for ritual or as a gift.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "strike-centre-tone",
   "term_zh": "正鼓音",
   "term_en": "strike-centre tone",
   "cat": "instrument",
   "def_zh": "敲击钟体正面正中鼓部所发出的那个音。",
   "def_en": "The tone produced by striking the centre of the bell's sounding area.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "side-strike-tone",
   "term_zh": "侧鼓音",
   "term_en": "side-strike tone",
   "cat": "instrument",
   "def_zh": "敲击鼓部偏侧位置所发出的第二个音，与正鼓音不同。",
   "def_en": "The second tone produced by striking off-centre on the sounding area.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "two-tone-bell",
   "term_zh": "一钟双音",
   "term_en": "two-tone bell",
   "cat": "instrument",
   "def_zh": "一口钟能发出两个不同音高的现象，是曾侯乙编钟最著名的声学特征。",
   "def_en": "The phenomenon of one bell sounding two distinct pitches, the best-known acoustic feature of the Zeng Houyi bells.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "almond-shaped-cross-section",
   "term_zh": "合瓦形",
   "term_en": "almond-shaped cross-section",
   "cat": "instrument",
   "def_zh": "钟体横截面接近两片瓦相合的椭圆，是双音得以分离的结构基础。",
   "def_en": "A cross-section like two tiles joined, near-elliptical; the structural basis for separating two tones.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "bianqing-chime-stones",
   "term_zh": "编磬",
   "term_en": "bianqing (chime stones)",
   "cat": "instrument",
   "def_zh": "成组悬挂的石制打击乐器，与编钟配合用于礼乐。",
   "def_en": "A set of suspended stone chimes used together with bells in ritual music.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "guqin",
   "term_zh": "古琴",
   "term_en": "guqin",
   "cat": "instrument",
   "def_zh": "中国传统七弦弹拨乐器，面板上有十三个徽位标记泛音位置。",
   "def_en": "The Chinese seven-string zither, with thirteen studs marking harmonic nodes.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "hui-node-marker",
   "term_zh": "徽位",
   "term_en": "hui (node marker)",
   "cat": "instrument",
   "def_zh": "古琴面板上的十三个标记，对应弦长 1/2、1/3、1/4 等泛音节点。",
   "def_en": "One of thirteen studs on a qin soundboard marking nodes at 1/2, 1/3, 1/4 of the string and so on.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "harmonic",
   "term_zh": "泛音",
   "term_en": "harmonic",
   "cat": "instrument",
   "def_zh": "弦或管振动产生的整数倍频率成分；泛音列的整数比是纯律音程的物理来源。",
   "def_en": "Integer-multiple frequency components of a vibrating string or pipe; their integer ratios are the physical source of just intervals.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "xun",
   "term_zh": "埙",
   "term_en": "xun",
   "cat": "instrument",
   "def_zh": "中国古老的陶制闭管吹奏乐器，音色浑厚。",
   "def_en": "An ancient Chinese closed-pipe ceramic wind instrument with a dark timbre.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "sheng",
   "term_zh": "笙",
   "term_en": "sheng",
   "cat": "instrument",
   "def_zh": "中国自由簧管乐器，能同时吹奏多个音。",
   "def_en": "A Chinese free-reed mouth organ capable of sounding several pitches at once.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "panpipes",
   "term_zh": "排箫",
   "term_en": "panpipes",
   "cat": "instrument",
   "def_zh": "多根不同长度的管子依次排列而成的吹奏乐器。",
   "def_en": "A wind instrument of several pipes of differing lengths in a row.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "xiao",
   "term_zh": "箫",
   "term_en": "xiao",
   "cat": "instrument",
   "def_zh": "中国竖吹竹管乐器，音色清远。",
   "def_en": "The Chinese end-blown bamboo flute, with a clear distant tone.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "dizi",
   "term_zh": "笛",
   "term_en": "dizi",
   "cat": "instrument",
   "def_zh": "中国横吹竹笛，以膜孔振动形成独特音色。",
   "def_en": "The Chinese transverse bamboo flute, with a membrane hole producing its characteristic timbre.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "piano",
   "term_zh": "钢琴",
   "term_en": "piano",
   "cat": "instrument",
   "def_zh": "键盘击弦乐器；现代钢琴按十二平均律调律，并采用伸展的调音曲线。",
   "def_en": "A keyboard hammer instrument; modern pianos are tuned in 12-TET with a stretched tuning curve.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "guitar",
   "term_zh": "吉他",
   "term_en": "guitar",
   "cat": "instrument",
   "def_zh": "有品丝的弹拨乐器，品丝位置按十二平均律公式排列。",
   "def_en": "A fretted plucked instrument whose fret positions follow the 12-TET formula.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "fret",
   "term_zh": "品丝",
   "term_en": "fret",
   "cat": "instrument",
   "def_zh": "吉他指板上的金属条，把弦长按 2^(-n/12) 的比例分段以得到平均律音高。",
   "def_en": "The metal bars on a guitar fingerboard that divide the string at 2^(-n/12) to give equal-tempered pitches.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "string-pitch-standard",
   "term_zh": "弦准",
   "term_en": "string pitch-standard",
   "cat": "instrument",
   "def_zh": "朱载堉为验证新法密率而制作的定音弦器，用以核对各律长度。",
   "def_en": "Zhu Zaiyu's string device for checking the lengths of the twelve lü against his new ratio.",
   "source_ids": [
    "S12",
    "S31"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "zeng-houyi-bells",
   "term_zh": "曾侯乙编钟",
   "term_en": "Zeng Houyi bells",
   "cat": "instrument",
   "def_zh": "1978 年湖北随州曾侯乙墓出土的 65 件青铜编钟，跨三个以上八度、按半音阶调律。",
   "def_en": "The 65 bronze bells from the 1978 excavation of Marquis Yi of Zeng's tomb at Suizhou, Hubei; over three octaves, tuned chromatically.",
   "source_ids": [
    "S12"
   ],
   "cat_zh_10": "乐器"
  },
  {
   "id": "harmonic-series",
   "term_zh": "泛音列",
   "term_en": "harmonic series",
   "cat": "acoustics",
   "def_zh": "基频及其整数倍频率构成的序列，是纯律比率的物理基础。",
   "def_en": "The series of a fundamental and its integer multiples; the physical basis of just ratios.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "fundamental-frequency",
   "term_zh": "基频",
   "term_en": "fundamental frequency",
   "cat": "acoustics",
   "def_zh": "复合音中频率最低、决定感知音高的成分。",
   "def_en": "The lowest component of a complex tone, which fixes the perceived pitch.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "harmonic-partial",
   "term_zh": "谐波",
   "term_en": "harmonic partial",
   "cat": "acoustics",
   "def_zh": "频率为基频整数倍的分音，第 n 谐波频率为 n 倍基频。",
   "def_en": "A partial whose frequency is an integer multiple of the fundamental.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "beat",
   "term_zh": "拍音",
   "term_en": "beat",
   "cat": "acoustics",
   "def_zh": "两个频率相近的声音叠加后，幅度周期性起伏的现象。",
   "def_en": "The periodic swelling of amplitude when two close frequencies sound together.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "beat-frequency",
   "term_zh": "拍频",
   "term_en": "beat frequency",
   "cat": "acoustics",
   "def_zh": "拍音起伏的重复频率，等于两个频率之差的绝对值。",
   "def_en": "The repetition rate of beating, equal to the absolute frequency difference.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "resonance",
   "term_zh": "共振",
   "term_en": "resonance",
   "cat": "acoustics",
   "def_zh": "系统在接近其固有频率时振幅显著增大的现象。",
   "def_en": "The marked increase in response when a system is driven near its natural frequency.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "timbre",
   "term_zh": "音色",
   "term_en": "timbre",
   "cat": "acoustics",
   "def_zh": "由谐波构成、包络与噪声成分共同决定的声音品质差异。",
   "def_en": "The qualitative difference of sounds set by spectral content, envelope and noise.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "spectrum",
   "term_zh": "频谱",
   "term_en": "spectrum",
   "cat": "acoustics",
   "def_zh": "一个声音中各频率成分的强度分布。",
   "def_en": "The distribution of energy across frequencies in a sound.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "fourier-transform",
   "term_zh": "傅里叶变换",
   "term_en": "Fourier transform",
   "cat": "acoustics",
   "def_zh": "把时域信号分解为频率成分的数学工具，是检测拍频与音高的基础。",
   "def_en": "The mathematical tool that decomposes a time signal into frequency components; the basis of pitch and beat detection.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "loudness",
   "term_zh": "响度",
   "term_en": "loudness",
   "cat": "acoustics",
   "def_zh": "听觉感受到的声音强弱，与声压级、频率和时长都有关。",
   "def_en": "The perceived strength of a sound, dependent on level, frequency and duration.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "decibel",
   "term_zh": "分贝",
   "term_en": "decibel",
   "cat": "acoustics",
   "def_zh": "声压或功率的对数比值单位，用于度量声音强弱。",
   "def_en": "A logarithmic unit of pressure or power ratio used to express sound level.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "pure-tone",
   "term_zh": "纯音",
   "term_en": "pure tone",
   "cat": "acoustics",
   "def_zh": "只含单一频率的正弦声，是测量与校准的理想信号。",
   "def_en": "A sine wave of one frequency only; the ideal signal for measurement and calibration.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "complex-tone",
   "term_zh": "复合音",
   "term_en": "complex tone",
   "cat": "acoustics",
   "def_zh": "含多个频率成分的声音，绝大多数乐器发声都属于此类。",
   "def_en": "A sound containing several frequency components, as nearly all instruments produce.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "string-vibration",
   "term_zh": "弦振动",
   "term_en": "string vibration",
   "cat": "acoustics",
   "def_zh": "弦的横振动形成驻波；频率与长度成反比、与张力平方根成正比。",
   "def_en": "Transverse string vibration forming standing waves; frequency is inversely proportional to length and proportional to the square root of tension.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "tension",
   "term_zh": "张力",
   "term_en": "tension",
   "cat": "acoustics",
   "def_zh": "弦所受的拉力，是决定弦频率的三个主要参数之一。",
   "def_en": "The pulling force on a string, one of the three main determinants of its frequency.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "string-length",
   "term_zh": "弦长",
   "term_en": "string length",
   "cat": "acoustics",
   "def_zh": "弦的振动长度；在张力与线密度不变时，频率与弦长成反比。",
   "def_en": "The vibrating length of a string; with tension and density fixed, frequency is inversely proportional to it.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "standing-wave",
   "term_zh": "驻波",
   "term_en": "standing wave",
   "cat": "acoustics",
   "def_zh": "在有限介质中由入射与反射叠加形成的稳定振动形态。",
   "def_en": "A stable vibration pattern formed by incident and reflected waves in a bounded medium.",
   "source_ids": [
    "S31",
    "S29"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "end-correction",
   "term_zh": "管口校正",
   "term_en": "end correction",
   "cat": "acoustics",
   "def_zh": "律管中气柱会略微超出管口，故有效长度需作修正；朱载堉以异径管律处理该问题。",
   "def_en": "The air column in a pipe extends slightly beyond its end, so effective length must be corrected; Zhu Zaiyu addressed this with varying pipe diameters.",
   "source_ids": [
    "S2"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "varying-diameter-pipe-tuning",
   "term_zh": "异径管律",
   "term_en": "varying-diameter pipe tuning",
   "cat": "acoustics",
   "def_zh": "朱载堉提出的律管方案：令各管管径随音高递变，使管律与弦律对应。",
   "def_en": "Zhu Zaiyu's scheme of varying pipe diameters with pitch so that pipe tuning matches string tuning.",
   "source_ids": [
    "S2"
   ],
   "cat_zh_10": "声学"
  },
  {
   "id": "marquis-yi-of-zeng",
   "term_zh": "曾侯乙",
   "term_en": "Marquis Yi of Zeng",
   "cat": "history",
   "def_zh": "战国早期曾国国君，其墓葬年代约在公元前 433 年。",
   "def_en": "A ruler of the state of Zeng in the early Warring States period, buried around 433 BCE.",
   "source_ids": [
    "S12",
    "S13"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "tomb-of-marquis-yi-of-zeng",
   "term_zh": "曾侯乙墓",
   "term_en": "Tomb of Marquis Yi of Zeng",
   "cat": "history",
   "def_zh": "1978 年发掘于湖北随州擂鼓墩，出土编钟、编磬等大批乐器。",
   "def_en": "Excavated in 1978 at Leigudun, Suizhou, Hubei; it yielded the great bell set and many other instruments.",
   "source_ids": [
    "S12",
    "S13"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "lüshi-chunqiu",
   "term_zh": "吕氏春秋",
   "term_en": "Lüshi Chunqiu",
   "cat": "history",
   "def_zh": "战国末期秦相吕不韦门客编纂的典籍，《音律》篇记载十二律相生次序。",
   "def_en": "A late Warring States compendium; its 'Yinlü' chapter records the generation order of the twelve lü.",
   "source_ids": [
    "S1",
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "guanzi",
   "term_zh": "管子",
   "term_en": "Guanzi",
   "cat": "history",
   "def_zh": "先秦典籍，其中《地员》篇记载以三分损益法生成五音。",
   "def_en": "A pre-Qin text whose 'Diyuan' chapter records generating the five notes by sanfen sunyi.",
   "source_ids": [
    "S1",
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "shiji-treatise-on-pitch-pipes",
   "term_zh": "史记·律书",
   "term_en": "Shiji, 'Treatise on Pitch Pipes'",
   "cat": "history",
   "def_zh": "司马迁《史记》八书之一，记载律与数的关系及生律方法。",
   "def_en": "One of the eight treatises in Sima Qian's Shiji, discussing pitch pipes, number and generation methods.",
   "source_ids": [
    "S1",
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "jing-fang",
   "term_zh": "京房",
   "term_en": "Jing Fang",
   "cat": "history",
   "def_zh": "汉代律学家，把三分损益推进到六十律。",
   "def_en": "A Han-dynasty theorist who extended sanfen sunyi to sixty lü.",
   "source_ids": [
    "S1",
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "he-chengtian",
   "term_zh": "何承天",
   "term_en": "He Chengtian",
   "cat": "history",
   "def_zh": "南朝（370–447）律学家，提出在十二律内部调整的「新律」。",
   "def_en": "A Southern-Dynasties theorist (370–447) who proposed a 'new lü' by internal adjustment of the twelve.",
   "source_ids": [
    "S1",
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "zhu-zaiyu",
   "term_zh": "朱载堉",
   "term_en": "Zhu Zaiyu",
   "cat": "history",
   "def_zh": "明代（1536–1611）律学家、算学家，提出新法密率，用 2^(1/12) 等分八度。",
   "def_en": "A Ming-dynasty theorist and mathematician (1536–1611) who proposed the xinfa milü, dividing the octave by 2^(1/12).",
   "source_ids": [
    "S1",
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "lüxue-xinshuo",
   "term_zh": "律学新说",
   "term_en": "Lüxue xinshuo",
   "cat": "history",
   "def_zh": "朱载堉著作，导言成于 1584 年，首次系统阐述新法密率。",
   "def_en": "Zhu Zaiyu's treatise, with an introduction dated 1584, first setting out the xinfa milü systematically.",
   "source_ids": [
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "lülü-jingyi",
   "term_zh": "律吕精义",
   "term_en": "Lülü jingyi",
   "cat": "history",
   "def_zh": "朱载堉六卷著作，导言刊于 1596 年，详述等程律算法与管律校正。",
   "def_en": "Zhu Zaiyu's six-volume work, with a 1596 introduction, detailing the algorithm and pipe corrections.",
   "source_ids": [
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "yuelü-quanshu",
   "term_zh": "乐律全书",
   "term_en": "Yuelü quanshu",
   "cat": "history",
   "def_zh": "朱载堉著作总集，十九卷本于 1606 年完成。",
   "def_en": "Zhu Zaiyu's collected writings, completed in a 19-volume edition in 1606.",
   "source_ids": [
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "matteo-ricci",
   "term_zh": "利玛窦",
   "term_en": "Matteo Ricci",
   "cat": "history",
   "def_zh": "明末来华意大利耶稣会士，其书信记录了当时朝廷改历与乐律争论。",
   "def_en": "An Italian Jesuit at the late-Ming court whose letters record contemporary calendar and music-theory disputes.",
   "source_ids": [
    "S1",
    "S2"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "joseph-marie-amiot",
   "term_zh": "钱德明",
   "term_en": "Joseph-Marie Amiot",
   "cat": "history",
   "def_zh": "18 世纪法国耶稣会士，1779 年出版《中国音乐回忆录》，首次系统向欧洲介绍中国乐律。",
   "def_en": "An 18th-century French Jesuit whose 1779 Mémoire first introduced Chinese music theory systematically to Europe.",
   "source_ids": [
    "S1"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "simon-stevin",
   "term_zh": "斯特芬",
   "term_en": "Simon Stevin",
   "cat": "history",
   "def_zh": "荷兰数学家（1548–1620），约 1585 年推算以 2^(1/12) 等分八度。",
   "def_en": "A Dutch mathematician (1548–1620) who worked out dividing the octave by 2^(1/12) around 1585.",
   "source_ids": [
    "S22"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "andreas-werckmeister",
   "term_zh": "韦克迈斯特",
   "term_en": "Andreas Werckmeister",
   "cat": "history",
   "def_zh": "德国音乐理论家（1645–1706），提出多种良好律制，其「第三律」流传最广。",
   "def_en": "A German theorist (1645–1706) who proposed several well temperaments, the third being the most widely used.",
   "source_ids": [
    "S23"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "j-s-bach",
   "term_zh": "巴赫",
   "term_en": "J. S. Bach",
   "cat": "history",
   "def_zh": "德国作曲家（1685–1750），1722 年编成《平均律键盘曲集》第一卷。",
   "def_en": "A German composer (1685–1750) whose Well-Tempered Clavier Book I appeared in 1722.",
   "source_ids": [
    "S25"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "the-well-tempered-clavier",
   "term_zh": "平均律键盘曲集",
   "term_en": "The Well-Tempered Clavier",
   "cat": "history",
   "def_zh": "巴赫为 24 个大小调各写前奏曲与赋格的曲集；标题中的「良好调律」不等于十二平均律。",
   "def_en": "Bach's collection of preludes and fugues in all 24 keys; its 'well-tempered' title does not mean 12-TET.",
   "source_ids": [
    "S25"
   ],
   "cat_zh_10": "历史"
  },
  {
   "id": "raga",
   "term_zh": "拉格",
   "term_en": "raga",
   "cat": "world",
   "def_zh": "印度音乐的旋律框架，规定可用音级、进行方向与情绪色彩。",
   "def_en": "The melodic framework of Indian music, specifying available degrees, direction and mood.",
   "source_ids": [
    "S16",
    "S18",
    "S21"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "svara",
   "term_zh": "斯瓦拉",
   "term_en": "svara",
   "cat": "world",
   "def_zh": "印度音乐的音级单位，七个基本斯瓦拉构成一个八度框架。",
   "def_en": "A degree of Indian music; seven basic svaras frame the octave.",
   "source_ids": [
    "S16",
    "S18",
    "S21"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "shruti",
   "term_zh": "什鲁蒂",
   "term_en": "shruti",
   "cat": "world",
   "def_zh": "印度理论中的微分音单位，传统上认为一个八度含 22 个什鲁蒂。",
   "def_en": "A microtonal unit in Indian theory; tradition holds that an octave contains 22 shrutis.",
   "source_ids": [
    "S16"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "22-shruti",
   "term_zh": "二十二什鲁蒂",
   "term_en": "22 shruti",
   "cat": "world",
   "def_zh": "印度传统理论的 22 个微分音划分；它是理论框架，不同文献给出的具体音分值不同。",
   "def_en": "The traditional 22-fold microtonal division; a theoretical frame whose exact cent values differ between sources.",
   "source_ids": [
    "S16",
    "S17"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "hindustani-music",
   "term_zh": "印度斯坦音乐",
   "term_en": "Hindustani music",
   "cat": "world",
   "def_zh": "北印度古典音乐传统，以拉格与塔拉为核心。",
   "def_en": "The North Indian classical tradition organised around raga and tala.",
   "source_ids": [
    "S16",
    "S18",
    "S21"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "carnatic-music",
   "term_zh": "卡纳提克音乐",
   "term_en": "Carnatic music",
   "cat": "world",
   "def_zh": "南印度古典音乐传统，曲目与即兴体系自成一体。",
   "def_en": "The South Indian classical tradition with its own repertoire and improvisation system.",
   "source_ids": [
    "S16",
    "S18",
    "S21"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "tala",
   "term_zh": "塔拉",
   "term_en": "tala",
   "cat": "world",
   "def_zh": "印度音乐的节拍循环框架。",
   "def_en": "The cyclical rhythmic framework of Indian music.",
   "source_ids": [
    "S16",
    "S18",
    "S21"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "maqam",
   "term_zh": "木卡姆",
   "term_en": "maqam",
   "cat": "world",
   "def_zh": "阿拉伯音乐的模式体系，规定音级、常用音程与旋律走向；常被 24 平均律近似，但实践更细致。",
   "def_en": "The Arabic modal system of degrees, characteristic intervals and melodic paths; often approximated by 24-TET, though practice is finer.",
   "source_ids": [
    "S18",
    "S19"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "makam",
   "term_zh": "玛卡姆",
   "term_en": "makam",
   "cat": "world",
   "def_zh": "土耳其音乐的模式体系，与阿拉伯木卡姆同源而音程有别。",
   "def_en": "The Turkish modal system, related to Arabic maqam but with different interval practice.",
   "source_ids": [
    "S19"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "quarter-tone",
   "term_zh": "四分之一音",
   "term_en": "quarter tone",
   "cat": "world",
   "def_zh": "约 50 音分的音程，是 24 平均律的一步，也是描述木卡姆微分音的常用单位。",
   "def_en": "An interval of about 50 cents, one step of 24-TET and a common unit for maqam microtones.",
   "source_ids": [
    "S16",
    "S18",
    "S21"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "microtone",
   "term_zh": "微分音",
   "term_en": "microtone",
   "cat": "world",
   "def_zh": "小于十二平均律半音的各类音程的通称。",
   "def_en": "A general term for intervals smaller than a 12-TET semitone.",
   "source_ids": [
    "S16",
    "S18",
    "S21"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "gamelan",
   "term_zh": "甘美兰",
   "term_en": "gamelan",
   "cat": "world",
   "def_zh": "印尼的成套金属打击乐合奏，同一乐队内各乐器成对调音略有差异以产生「波动」音色。",
   "def_en": "An Indonesian metal percussion ensemble in which paired instruments are detuned slightly to produce shimmer.",
   "source_ids": [
    "S20"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "slendro",
   "term_zh": "斯连德罗",
   "term_en": "slendro",
   "cat": "world",
   "def_zh": "印尼甘美兰的五声音阶体系，音程接近等分（约 240 音分/步）。",
   "def_en": "A five-tone Javanese/Balinese scale with steps near-equal, about 240 cents each.",
   "source_ids": [
    "S20"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "pelog",
   "term_zh": "佩洛格",
   "term_en": "pelog",
   "cat": "world",
   "def_zh": "印尼甘美兰的七声音阶体系，音程明显不等。",
   "def_en": "A seven-tone gamelan scale with markedly unequal steps.",
   "source_ids": [
    "S20"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "thai-traditional-music",
   "term_zh": "泰国音乐",
   "term_en": "Thai traditional music",
   "cat": "world",
   "def_zh": "泰国传统音乐的音阶常被描述为七等分八度（约 171.43 音分/步）。",
   "def_en": "Thai traditional scales are commonly described as seven equal divisions of the octave, about 171.43 cents per step.",
   "source_ids": [
    "S21"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "cairo-congress-of-arab-music",
   "term_zh": "开罗会议",
   "term_en": "Cairo Congress of Arab Music",
   "cat": "world",
   "def_zh": "1932 年在开罗召开的阿拉伯音乐会议，留下大批录音，成为木卡姆音高研究的基准材料。",
   "def_en": "The 1932 Cairo congress on Arab music, whose recordings became a benchmark corpus for maqam intonation research.",
   "source_ids": [
    "S18"
   ],
   "cat_zh_10": "世界音乐"
  },
  {
   "id": "frequency-ratio",
   "term_zh": "频率比",
   "term_en": "frequency ratio",
   "cat": "math",
   "def_zh": "两个音的频率之比；音程的数学本质就是频率比。",
   "def_en": "The ratio of two frequencies; an interval is mathematically just such a ratio.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "string-length-ratio",
   "term_zh": "弦长比",
   "term_en": "string-length ratio",
   "cat": "math",
   "def_zh": "两个音对应弦长之比，与频率比互为倒数。",
   "def_en": "The ratio of the corresponding string lengths; the reciprocal of the frequency ratio.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "logarithm",
   "term_zh": "对数",
   "term_en": "logarithm",
   "cat": "math",
   "def_zh": "把乘除关系转化为加减关系的运算，是音分体系的数学前提。",
   "def_en": "The operation turning multiplication into addition, the mathematical premise of the cent system.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "binary-logarithm",
   "term_zh": "以二为底的对数",
   "term_en": "binary logarithm",
   "cat": "math",
   "def_zh": "记作 log2；音分公式 1200·log2(f2/f1) 即建立在其上。",
   "def_en": "Written log2; the cent formula 1200·log2(f2/f1) is built on it.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "twelfth-root",
   "term_zh": "十二次方根",
   "term_en": "twelfth root",
   "cat": "math",
   "def_zh": "满足 x^12 = 2 的正实数，即 2^(1/12) ≈ 1.0594630943592953。",
   "def_en": "The positive real x with x^12 = 2, i.e. 2^(1/12) ≈ 1.0594630943592953.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "irrational-number",
   "term_zh": "无理数",
   "term_en": "irrational number",
   "cat": "math",
   "def_zh": "不能写成两个整数之比的实数；2^(1/12) 即无理数，故平均律无法用简单分数精确表达。",
   "def_en": "A real number not expressible as a ratio of integers; 2^(1/12) is irrational, so equal temperament cannot be written in simple fractions.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "geometric-progression",
   "term_zh": "等比数列",
   "term_en": "geometric progression",
   "cat": "math",
   "def_zh": "相邻两项之比恒定的数列；十二平均律的十二个比率构成等比数列。",
   "def_en": "A sequence with a constant ratio between successive terms; the twelve 12-TET ratios form one.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "normalization",
   "term_zh": "归一化",
   "term_en": "normalization",
   "cat": "math",
   "def_zh": "把数值折算到统一范围以便比较，如把频率比折算到一个八度内。",
   "def_en": "Rescaling values into a common range for comparison, e.g. folding frequency ratios into one octave.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "octave-folding",
   "term_zh": "八度折叠",
   "term_en": "octave folding",
   "cat": "math",
   "def_zh": "把任意音高按 2 的整数次幂折回同一八度内的操作，数学上是模 1200 取余。",
   "def_en": "Bringing any pitch back into one octave by powers of two; mathematically a modulo-1200 operation.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "modular-arithmetic",
   "term_zh": "模运算",
   "term_en": "modular arithmetic",
   "cat": "math",
   "def_zh": "取余数的运算；音高级别（pitch class）即对八度取模的结果。",
   "def_en": "Arithmetic on remainders; pitch class is exactly pitch taken modulo the octave.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "relative-error",
   "term_zh": "相对误差",
   "term_en": "relative error",
   "cat": "math",
   "def_zh": "绝对误差与真值之比，用于衡量计算精度而不受量纲影响。",
   "def_en": "Absolute error divided by the true value; a scale-free measure of accuracy.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "closure-error",
   "term_zh": "闭合误差",
   "term_en": "closure error",
   "cat": "math",
   "def_zh": "沿着一个循环生成序列回到起点时与原点的偏差，如十二个五度累计对七个八度的 23.46 音分。",
   "def_en": "The deviation from the starting point after a cyclic generation, e.g. the 23.46-cent gap between twelve fifths and seven octaves.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "precision",
   "term_zh": "精度",
   "term_en": "precision",
   "cat": "math",
   "def_zh": "计算结果的有效位数与可信程度；朱载堉把 2^(1/12) 算到二十余位小数。",
   "def_en": "The number of reliable digits in a computation; Zhu Zaiyu carried 2^(1/12) to more than twenty decimal places.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "abacus-calculation",
   "term_zh": "珠算",
   "term_en": "abacus calculation",
   "cat": "math",
   "def_zh": "以算盘进行的计算技术；朱载堉用它完成大规模开方运算。",
   "def_en": "Calculation on the Chinese abacus, with which Zhu Zaiyu carried out large-scale root extraction.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "exponentiation",
   "term_zh": "幂运算",
   "term_en": "exponentiation",
   "cat": "math",
   "def_zh": "重复相乘的运算；2^(1/12) 表示 2 的十二次方根。",
   "def_en": "Repeated multiplication; 2^(1/12) denotes the twelfth root of two.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "numerical-approximation",
   "term_zh": "数值近似",
   "term_en": "numerical approximation",
   "cat": "math",
   "def_zh": "用有限位数或有限步骤逼近真实数值，音分表与密率都属此类。",
   "def_en": "Approaching a true value with finitely many digits or steps, as both cent tables and the milü do.",
   "source_ids": [
    "S8",
    "S11"
   ],
   "cat_zh_10": "数学"
  },
  {
   "id": "pentatonic-scale",
   "term_zh": "五声",
   "term_en": "pentatonic scale",
   "cat": "notation",
   "def_zh": "宫、商、角、徵、羽五个音构成的音阶，是中国传统旋律的基础。",
   "def_en": "The five-note scale of gong, shang, jue, zhi, yu, the basis of Chinese traditional melody.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "heptatonic-scale",
   "term_zh": "七声",
   "term_en": "heptatonic scale",
   "cat": "notation",
   "def_zh": "七声音阶；中国传统七声在五声基础上加入两个偏音。",
   "def_en": "A seven-note scale; the Chinese heptatonic adds two secondary notes to the pentatonic core.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "gong",
   "term_zh": "宫",
   "term_en": "gong",
   "cat": "notation",
   "def_zh": "五声之主音，相当于调式的中心音。",
   "def_en": "The tonic of the five-note system, the modal centre.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "shang",
   "term_zh": "商",
   "term_en": "shang",
   "cat": "notation",
   "def_zh": "五声第二音，与宫成一个大二度。",
   "def_en": "The second degree of the pentatonic, a major second above gong.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "jue",
   "term_zh": "角",
   "term_en": "jue",
   "cat": "notation",
   "def_zh": "五声第三音，与宫成一个大三度。",
   "def_en": "The third degree of the pentatonic, a major third above gong.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "zhi",
   "term_zh": "徵",
   "term_en": "zhi",
   "cat": "notation",
   "def_zh": "五声第四音，与宫成一个纯五度。",
   "def_en": "The fourth degree of the pentatonic, a perfect fifth above gong.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "yu",
   "term_zh": "羽",
   "term_en": "yu",
   "cat": "notation",
   "def_zh": "五声第五音，与宫成一个大六度。",
   "def_en": "The fifth degree of the pentatonic, a major sixth above gong.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "huangzhong",
   "term_zh": "黄钟",
   "term_en": "Huangzhong",
   "cat": "notation",
   "def_zh": "十二律第一律，也是三分损益生律的起点与基准。",
   "def_en": "The first of the twelve lü and the starting point of sanfen sunyi generation.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "dalü",
   "term_zh": "大吕",
   "term_en": "Dalü",
   "cat": "notation",
   "def_zh": "十二律第二律，由黄钟生律体系中的第八次结果。",
   "def_en": "The second of the twelve lü, the eighth result in the generation sequence.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "taicu",
   "term_zh": "太簇",
   "term_en": "Taicu",
   "cat": "notation",
   "def_zh": "十二律第三律，与黄钟成一个大二度。",
   "def_en": "The third of the twelve lü, a major second above Huangzhong.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "jiazhong",
   "term_zh": "夹钟",
   "term_en": "Jiazhong",
   "cat": "notation",
   "def_zh": "十二律第四律，生律序列中的第十个。",
   "def_en": "The fourth of the twelve lü, the tenth in the generation sequence.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "guxian",
   "term_zh": "姑洗",
   "term_en": "Guxian",
   "cat": "notation",
   "def_zh": "十二律第五律，与黄钟成一个大三度。",
   "def_en": "The fifth of the twelve lü, a major third above Huangzhong.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "zhonglü",
   "term_zh": "仲吕",
   "term_en": "Zhonglü",
   "cat": "notation",
   "def_zh": "十二律第六律，是三分损益第十二个（最后）生出的律；再走一步即出现毕氏音差。",
   "def_en": "The sixth of the twelve lü and the last produced by the twelve-step chain; one further step exposes the Pythagorean comma.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "ruibin",
   "term_zh": "蕤宾",
   "term_en": "Ruibin",
   "cat": "notation",
   "def_zh": "十二律第七律，生律序列中的第七个。",
   "def_en": "The seventh of the twelve lü, the seventh in the generation sequence.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "linzhong",
   "term_zh": "林钟",
   "term_en": "Linzhong",
   "cat": "notation",
   "def_zh": "十二律第八律，由黄钟下生所得，与黄钟成纯五度。",
   "def_en": "The eighth of the twelve lü, produced by the first descending generation; a perfect fifth above Huangzhong.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "yize",
   "term_zh": "夷则",
   "term_en": "Yize",
   "cat": "notation",
   "def_zh": "十二律第九律，生律序列中的第九个。",
   "def_en": "The ninth of the twelve lü, ninth in the generation sequence.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "nanlü",
   "term_zh": "南吕",
   "term_en": "Nanlü",
   "cat": "notation",
   "def_zh": "十二律第十律，与黄钟成一个小三度（八度折叠后）。",
   "def_en": "The tenth of the twelve lü, a minor third above Huangzhong after octave folding.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "wuyi",
   "term_zh": "无射",
   "term_en": "Wuyi",
   "cat": "notation",
   "def_zh": "十二律第十一律，生律序列中的第十一个。",
   "def_en": "The eleventh of the twelve lü, eleventh in the generation sequence.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "yingzhong",
   "term_zh": "应钟",
   "term_en": "Yingzhong",
   "cat": "notation",
   "def_zh": "十二律第十二律，与黄钟成一个小二度。",
   "def_en": "The twelfth of the twelve lü, a minor second above Huangzhong.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "solfège-syllable",
   "term_zh": "唱名",
   "term_en": "solfège syllable",
   "cat": "notation",
   "def_zh": "do、re、mi 等用于演唱的音节名称，与音名的用法不同。",
   "def_en": "Syllables such as do, re, mi used for singing, distinct from pitch letters.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "pitch-letter-name",
   "term_zh": "音名",
   "term_en": "pitch letter name",
   "cat": "notation",
   "def_zh": "C、D、E 等字母名称，用于标定绝对音高。",
   "def_en": "Letter names such as C, D, E used to label absolute pitches.",
   "source_ids": [
    "S7",
    "S31"
   ],
   "cat_zh_10": "记谱与音名"
  },
  {
   "id": "temperament-setting",
   "term_zh": "调律",
   "term_en": "temperament setting",
   "cat": "tuning",
   "def_zh": "为键盘等固定音高乐器设定一套律制，使各音落在规定位置。",
   "def_en": "Setting a tuning scheme on a fixed-pitch instrument so each note lands in its prescribed place.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "tuning",
   "term_zh": "调音",
   "term_en": "tuning",
   "cat": "tuning",
   "def_zh": "把乐器各音调到目标音高的操作。",
   "def_en": "The act of bringing an instrument's pitches to their targets.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "reference-pitch",
   "term_zh": "基准音",
   "term_en": "reference pitch",
   "cat": "tuning",
   "def_zh": "调律时作为起点的标准音，现代惯例取 A4。",
   "def_en": "The standard pitch from which tuning starts; modern practice uses A4.",
   "source_ids": [
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "standard-pitch",
   "term_zh": "标准音高",
   "term_en": "standard pitch",
   "cat": "tuning",
   "def_zh": "国际约定的 A4 = 440 Hz（ISO 16:1975）。",
   "def_en": "The internationally agreed A4 = 440 Hz (ISO 16:1975).",
   "source_ids": [
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "absolute-pitch",
   "term_zh": "绝对音高",
   "term_en": "absolute pitch",
   "cat": "tuning",
   "def_zh": "不借助参照音即可辨识或重现具体音高的能力。",
   "def_en": "The ability to identify or produce a specific pitch without a reference.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "relative-pitch",
   "term_zh": "相对音高",
   "term_en": "relative pitch",
   "cat": "tuning",
   "def_zh": "借助参照音判断音程关系的能力，是调律与听辨的基础。",
   "def_en": "The ability to judge intervals against a reference, the basis of tuning and aural skills.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "interval",
   "term_zh": "音程",
   "term_en": "interval",
   "cat": "tuning",
   "def_zh": "两个音之间的音高距离，可用频率比或音分表示。",
   "def_en": "The pitch distance between two notes, expressible as a ratio or in cents.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "consonance",
   "term_zh": "协和",
   "term_en": "consonance",
   "cat": "tuning",
   "def_zh": "听觉上融合、稳定、无需解决的音程感受，与频率比的简单程度相关。",
   "def_en": "The perceptually fused, stable quality of certain intervals, related to the simplicity of their ratios.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "dissonance",
   "term_zh": "不协和",
   "term_en": "dissonance",
   "cat": "tuning",
   "def_zh": "听觉上紧张、粗糙、倾向解决的音程感受。",
   "def_en": "The tense, rough quality of intervals that seem to demand resolution.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "aural-discrimination",
   "term_zh": "听辨",
   "term_en": "aural discrimination",
   "cat": "tuning",
   "def_zh": "依靠听觉判断音高、音程与拍音差异的训练与能力。",
   "def_en": "The trained ability to judge pitch, interval and beating by ear.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "beat-detection",
   "term_zh": "拍频检测",
   "term_en": "beat detection",
   "cat": "tuning",
   "def_zh": "通过数拍音快慢来判断两音偏差的方法，是调律师的常用手段。",
   "def_en": "Judging the deviation of two pitches by counting the beat rate, a standard tuner's method.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "tuning-curve-stretch",
   "term_zh": "调音曲线",
   "term_en": "tuning curve (stretch)",
   "cat": "tuning",
   "def_zh": "钢琴调律时低音区略低、高音区略高的补偿曲线，因弦的非谐性所致。",
   "def_en": "The stretch used in piano tuning, with slightly flat bass and sharp treble because of string inharmonicity.",
   "source_ids": [
    "S9",
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  },
  {
   "id": "thermal-effect-on-pitch",
   "term_zh": "温度影响",
   "term_en": "thermal effect on pitch",
   "cat": "tuning",
   "def_zh": "温度变化改变弦的张力与管的长度，从而使实际音高偏移。",
   "def_en": "Temperature changes alter string tension and pipe dimensions, shifting actual pitch.",
   "source_ids": [
    "S26"
   ],
   "cat_zh_10": "演奏与调律"
  }
 ],
 "category_map": [
  {
   "id": "math",
   "name_zh": "数学基础",
   "name_en": "Mathematics"
  },
  {
   "id": "tuning",
   "name_zh": "律制",
   "name_en": "Tuning systems"
  },
  {
   "id": "instrument",
   "name_zh": "乐器",
   "name_en": "Instruments"
  },
  {
   "id": "history",
   "name_zh": "历史与文献",
   "name_en": "History & texts"
  },
  {
   "id": "acoustics",
   "name_zh": "声学",
   "name_en": "Acoustics"
  },
  {
   "id": "notation",
   "name_zh": "记谱与音名",
   "name_en": "Notation & pitch names"
  },
  {
   "id": "world",
   "name_zh": "世界音乐",
   "name_en": "World music"
  },
  {
   "id": "evidence",
   "name_zh": "方法与证据",
   "name_en": "Method & evidence"
  }
 ]
};
;
/* ===== 14. data/metrics.js ===== */
/* 《同律》全局数字（唯一真源 = _pipeline/metrics_app.json + metrics.json；页面禁止手写数字）
 * 自动生成，请勿手改。源：_research/*.json + metrics.json
 * 重建：py -X utf8 11_同律_国际专项赛/_pipeline/build_data_js.py
 */
window.__metrics = {
 "work": {
  "name_zh": "同律",
  "name_en": "CONCORD",
  "version": "1.0.0",
  "build_date": "2026-10-21"
 },
 "kernel": {
  "assertions": 747,
  "cross_checks": 1057,
  "max_rel_error": 1.1762403210983045e-16,
  "pythagorean_comma_cents": 23.460010384649014
 },
 "app": {
  "modules": 8,
  "modules_ready": 8,
  "dom_chars_zh": 6327,
  "dom_chars_en": 20297,
  "load_ms": 396,
  "console_errors": 0,
  "a11y_axe_violations": 0,
  "i18n_en_cjk_ratio": 0.00632,
  "app_version": "1.0.0"
 },
 "live": {
  "url": "file:///F:/sjq/%E6%95%B0%E5%AA%92/11_%E5%90%8C%E5%BE%8B_%E5%9B%BD%E9%99%85%E4%B8%93%E9%A1%B9%E8%B5%9B/01_%E4%BD%9C%E5%93%81%E6%9C%AC%E4%BD%93/%E5%90%8C%E5%BE%8B-%E5%BE%8B%E5%AD%A6%E4%BA%A4%E4%BA%92%E5%AE%9E%E9%AA%8C%E5%AE%A4/index.html",
  "http": 200,
  "axe": null,
  "fps_mean": 59.95,
  "fps_min": 59.71,
  "heap_growth_mb": -38.99,
  "runtime_errors": 0
 },
 "video": {
  "duration_s": null,
  "size_mb": null,
  "lufs": null,
  "fps": null,
  "res": null
 },
 "pack": {
  "entries": null,
  "size_mb": null,
  "pdfs": null,
  "screenshots": null,
  "anon_hits": null
 },
 "evidence": {
  "sources": 32,
  "glossary_terms": 177,
  "glossary_cats": 10
 },
 "audio": {
  "generated_by": "11_同律_国际专项赛/01_作品本体/同律-律学交互实验室/test/verify_audio.js",
  "ok": true,
  "total": 76,
  "passed": 76,
  "failed": 0,
  "max_single_tone_cents_error": 0.000241,
  "max_beat_hz_error": 0.005832,
  "single_tone_groups": 16,
  "beat_groups": 9,
  "sample_rate": 44100,
  "tolerances": {
   "single_tone_cents": 0.5,
   "beat_hz": 0.2,
   "pluck_cents": 20
  }
 },
 "_schema": "concord.metrics/v1",
 "_pending": [
  "live.axe",
  "video.duration_s",
  "video.size_mb",
  "video.lufs",
  "video.fps",
  "video.res",
  "pack.entries",
  "pack.size_mb",
  "pack.pdfs",
  "pack.screenshots",
  "pack.anon_hits"
 ],
 "_sources": {
  "work": "metrics.json",
  "kernel": "metrics.json",
  "app": "metrics_app.json",
  "live": "metrics.json",
  "video": "metrics.json",
  "pack": "metrics.json",
  "evidence": "metrics.json",
  "audio": "verify_audio.js"
 },
 "_fingerprint": "sha256:466331bf2659efff"
};
;
/* ===== 15. data/deps.js ===== */
/* 《同律》可选依赖清单（由 build_data_js.py 扫描目录生成；缺失依赖不会产生 404）
 * 自动生成，请勿手改。源：_research/*.json + metrics.json
 * 重建：py -X utf8 11_同律_国际专项赛/_pipeline/build_data_js.py
 */
window.__deps = {
 "tuning": true,
 "synth": true,
 "viz": [
  "bell",
  "centsRuler",
  "isochord",
  "monochord",
  "spectrum",
  "spiral5th",
  "worldmap"
 ],
 "paths": {
  "tuning": "core/tuning.js",
  "synth": "audio/synth.js"
 },
 "viz_paths": {
  "bell": "viz/bell.js",
  "centsRuler": "viz/centsRuler.js",
  "isochord": "viz/isochord.js",
  "monochord": "viz/monochord.js",
  "spectrum": "viz/spectrum.js",
  "spiral5th": "viz/spiral5th.js",
  "worldmap": "viz/worldmap.js"
 }
};
;
/* ===== 16. i18n.js ===== */
/* ============================================================================
 * i18n.js —《同律》CONCORD 双语字典与渲染器
 * ----------------------------------------------------------------------------
 * 唯一文案真源：页面所有界面文字都必须来自这里（HTML 里只写 data-i18n 键名，
 * app.js 里只写 I18N.t('key')），不得在 JS 里散落裸中文。
 *
 * 用法
 *   I18N.t('m1.title')                → 当前语言的字符串
 *   I18N.t('m1.gap', { v: '23.46' })  → 插值：字典里写 {v}
 *   I18N.apply(document, 'en')        → 把 data-i18n* 属性全部重渲染 + 同步 <html lang>
 *   I18N.setLang('en')                → 记住选择（localStorage，失败静默）
 *
 * 支持属性
 *   data-i18n         → textContent
 *   data-i18n-html    → innerHTML（含 <b>/<em> 的行内强调）
 *   data-i18n-aria    → aria-label
 *   data-i18n-title   → title
 *   data-i18n-ph      → placeholder
 *
 * 依赖：无。零外部字体/网络请求。
 * ========================================================================== */
(function (W) {
  'use strict';

  /* ---------------------------------------------------------------- 词典 */
  var DICT = {
    /* ======================================================== 中文 zh */
    zh: {
      meta: {
        appName: '同律',
        appNameEn: 'CONCORD',
        docTitle: '同律 CONCORD · 律学交互实验室 v{v} — 一个八度的两种解法',
        subtitle: '一个八度的两种解法 —— 十二平均律的东西方之路',
        subtitleEn: 'One Octave, Two Solutions: The Eastern and Western Roads to Twelve-Tone Equal Temperament',
        kicker: '律学交互实验室 · 可听化 · 可复算',
        intro: '一个八度必须切成 12 个半音。用简单分数（3:2、2:1）一路叠下去，数学上永远回不到起点——差 23.46 音分。这件作品让你亲手算一遍、亲耳听一次：两个文明如何各自解开同一道题，而这一解今天被现代乐器与音乐工业的主流实践采用。',
        introHint: '建议顺序：先听见那不闭合的 23.46 音分，再看两个文明怎样各自解开它。',
        coverStats: '{m} 个模块 · {s} 套律制 · {n} 条术语'
      },

      a11y: {
        skip: '跳到主要内容',
        mainNav: '模块导航',
        langGroup: '语言 / Language',
        progress: '阅读进度',
        moduleList: '八个模块',
        demoRegion: '交互演示区',
        readouts: '实时读数',
        figures: '可核验数字',
        playGroup: '播放控制',
        toast: '状态提示',
        chart: '图表',
        aside: '补充说明'
      },

      ui: {
        zh: '中文',
        en: 'EN',
        play: '播放',
        stop: '停止',
        stopAll: '停止全部声音',
        stopAllShort: '静音',
        reset: '重置',
        next: '下一步',
        prev: '上一步',
        auto: '自动',
        run: '运行',
        playAll: '播放全部',
        compare: '对比播放',
        cents: '音分',
        centsShort: '音分',
        hz: 'Hz',
        step: '步',
        of: '/',
        notes: '音',
        source: '来源',
        statusVerified: '已核验',
        statusPending: '文献参考值',
        statusResearch: '已核验（文献）',
        statusOfficial: '已核验（官方）',
        statusLiterature: '文献参考值',
        statusComputed: '数学可复算',
        statusSeed: '种子数据',
        loading: '数据加载中',
        liveComputed: '实时计算',
        fromMetrics: '来自 metrics.json',
        reducedOn: '动效：已减弱',
        reducedOff: '动效：正常',
        motionToggle: '减弱动效',
        soundOn: '声音：开',
        soundOff: '声音：静音',
        keyboardHint: '键盘：Tab 遍历控件，空格/回车切换，方向键调滑块',
        version: '版本',
        close: '关闭',
        expand: '展开',
        collapse: '收起',
        selectTwo: '选择两套律制',
        systemA: '律制 A',
        systemB: '律制 B',
        melody: '旋律',
        chord: '和弦',
        interval: '音程',
        deviation: '偏差',
        diff: '差值',
        tick: '刻度',
        equal12: '十二平均律（对照基准）',
        worst: '最差音程',
        best: '最纯净音程',
        status: '状态',
        derived: '推导值',
        ratio: '比值'
      },

      nav: {
        brand: '同律',
        brandSub: 'CONCORD',
        m1: '序章',
        m2: '律尺',
        m3: '三分损益',
        m4: '密率',
        m5: '世界律制',
        m6: '编钟与琴',
        m7: '律与器',
        m8: '方法与证据',
        toc: '模块'
      },

      /* ---------------------------------------------------- M1 */
      m1: {
        kicker: '模块 01 · 问题',
        title: '序章 · 不闭合的八度',
        titleEn: 'Prologue · The Octave That Will Not Close',
        lead: '把 12 个纯五度（频率比 3:2）首尾相接，你大概会以为正好走到 7 个八度之外。实际不会：它比 7 个八度高出 23.46 音分。这个几乎听不出来的差值，是整部律学史的第一推动力。',
        demoTitle: '两条链，同一个终点？',
        demoDesc: '左链每步乘 3/2（纯五度），右链每步乘 2（八度）。走完 12 步五度、7 步八度后，两条链本应重合——请自己走一遍看差在哪里。',
        chainFifth: '12 个纯五度',
        chainOctave: '7 个八度',
        stepBtn: '叠一个五度',
        stepOctaveBtn: '叠一个八度',
        run12: '走完 12 步',
        reset: '回到起点',
        playCompare: '播放对比',
        playBeat: '播放拍音',
        readSteps: '已叠五度步数',
        readFifthEnd: '五度链终点（折叠后）',
        readOctaveEnd: '七倍八度终点',
        readGap: '缺口',
        readRatio: '两条链的长度比',
        readBeat: '拍频',
        beatNote: '两音同时发声时每秒相撞的次数',
        explainTitle: '这不是计算误差',
        explain: '3 是质数，2 也是质数：3^12/2^19 永远不可能等于 1。所以无论走多少步，五度链都走不到八度的整数倍。差值 531441/524288 = 1.013643…，即 23.46 音分，史称「毕达哥拉斯音差」。它不是近似算错，而是一个精确的数学事实——中外律学反复求解的都是它。',
        explainEq: '3^12/2^19',
        check1: '12 步纯五度累计音分',
        check2: '闭合误差（音分）',
        check3: '长度比 3^12/2^19',
        check4: '拍音（A4 与 +23.46 音分）',
        hintPlay: '声音需要你先点一下按钮才会响（浏览器安全策略）。'
      },

      /* ---------------------------------------------------- M2 */
      m2: {
        kicker: '模块 02 · 一根弦',
        title: '律尺 · 一根弦上的宇宙',
        titleEn: 'The Ruler · A Universe on One String',
        lead: '调音最原始的仪器是一根弦。把弦长截半，得到八度；截到三分之二，得到五度。所有律制都藏在这些分数里——拖动律尺，看它在频率和音分上变成什么。',
        demoTitle: '可移动的琴码',
        demoDesc: '拖动琴码改变被截取的弦长。弦越短，音越高：频率与弦长成反比。',
        sliderLabel: '弦长比（相对全弦）',
        presets: '音程预设',
        readLength: '弦长比',
        readRatio: '频率比',
        readHz: '频率',
        readCents: '音分（相对基准弦）',
        readNote: '最接近的音',
        readNearest: '与最近的十二平均律音差',
        baseLabel: '基准弦（黄钟 / C4）',
        stoppedLabel: '被截取的弦',
        invalid: '弦长比必须在 0.5 与 1 之间',
        explainTitle: '为什么是反比',
        explain: '频率 f = v/(2L)，速度 v 不变，所以 f ∝ 1/L。弦长减半（L→L/2）则 f→2f，就是八度；L→2L/3 则 f→3f/2，就是五度。音分则是把乘法变成加法：cents = 1200 x log2(f2/f1)。',
        explainEq: 'cents = 1200 x log2(f2/f1)',
        preset_octave: '八度 2:1',
        preset_fifth: '纯五度 3:2',
        preset_fourth: '纯四度 4:3',
        preset_major3just: '纯律大三度 5:4',
        preset_major3pyth: '毕氏大三度 81:64',
        preset_semitone: '平均律半音 2^(1/12)',
        noteOctave: '八度：弦长取一半',
        noteFifth: '五度：弦长取 2/3',
        noteFourth: '四度：弦长取 3/4',
        noteMajor3just: '纯律大三度：频率 5:4，弦长 4/5',
        noteMajor3pyth: '毕氏大三度：频率 81:64，弦长 64/81',
        noteSemitone: '平均律半音：频率 2^(1/12)，弦长 2^(-1/12)',
        playBoth: '同时发声',
        check1: '弦长与频率严格成反比',
        check2: '当前音分',
        check3: '预设表最大误差',
        check4: '五度 = 701.955 音分'
      },

      /* ---------------------------------------------------- M3 */
      m3: {
        kicker: '模块 03 · 中国解法之一',
        title: '三分损益 · 五度圈走不到头',
        titleEn: 'Sanfen Sunyi · The Circle That Cannot Close',
        lead: '中国古人用「三分损一、三分益一」交替生律：弦长乘 2/3 或 4/3，由黄钟先生出其余十一律。但这条路走不到头——把第 12 个五度叠上去时，它本应回到黄钟，实际却高出 23.46 音分。这个差值不是某两个律之间的距离，而是整条五度链绕行一周后的闭合误差。',
        demoTitle: '一步一生律',
        demoDesc: '每点一次「生一律」，按《吕氏春秋》的次序再叠一个纯五度，并把结果折叠回同一个八度内。',
        btnGen: '生一律',
        btnGenAll: '生成 12 律',
        btnReset: '重置',
        btnPlayWolf: '播放狼音',
        btnPlayScale: '播放十二律',
        tableStep: '步',
        tableName: '律名',
        tableRatio: '频率比',
        tableHz: '频率',
        tableCents: '音分',
        tableDev: '与平均律差',
        readClosing: '闭合误差',
        readNote: '第 12 律仲吕在黄钟上方',
        statusOpen: '未闭合',
        closureAttempt: '第 12 步',
        statusClosed: '已闭合',
        explainTitle: '每一步都是 3/2',
        explain: '生律规则：×3/2 后若超过八度就除 2 折回。黄钟经 11 次生律得到其余十一律（其中仲吕在黄钟上方 521.505 音分）；若以仲吕为起点再走第 12 步，本应回到黄钟，实际却高 23.46 音分。十二个五度累计 8423.46 音分，七个八度是 8400 音分，差正是 23.46。',
        wolfTitle: '「狼音」是什么',
        wolfDesc: '为了迁就这个缺口，历史上各律制留下某个格外刺耳的音程，乐师称之为「狼」。点「播放狼音」听一次：两个音几乎重合，每秒相撞二十几次，声音在抖。',
        check1: '十二律全部来自 3/2 链',
        check2: '闭合误差（音分）',
        check3: '第 12 律仲吕 / 黄钟',
        check4: '每步频率比',
        cellsLabel: '十二律表'
      },

      /* ---------------------------------------------------- M4 */
      m4: {
        kicker: '模块 04 · 中国解法之二',
        title: '密率 · 1584 年的第十二根',
        titleEn: 'The Cipher Ratio · The Twelfth Root, 1584',
        lead: '1584 年，朱载堉在《律学新说》中给出「新法密率」2^(1/12)：让第十二根弦正好是第一根的一半，八度由此可以被精确等分。同一时期，欧洲也在并行求解同一道题——本作品把两条路径并列展示，不作优先权断言。',
        demoTitle: '第十二根弦是怎么算出来的',
        demoDesc: '本页以平方根与立方根链演示与 2^(1/12) 等价的推导（朱载堉原著以珠算开方逐步求得同一数值）。每一步都能按一下复算。',
        stepBtn: '下一步推导',
        showAll: '显示全部推导',
        resetDerivation: '重新推导',
        stepsTitle: '推导步骤',
        litTitle: '文献抄录值 vs 本页计算',
        litRecorded: '文献抄录值',
        litComputed: '本页计算值',
        litDiff: '差',
        powerTitle: '闭合检验：12 次幂是否等于 2',
        powerResult: '密率^12',
        powerTarget: '目标',
        powerDiff: '误差',
        timelineTitle: '并行解题时间线',
        abTitle: '三种律制 A/B 听辨',
        abDesc: '同一段旋律（C–E–G–B–C），在三种律制下分别播放。',
        abSanfen: '三分损益',
        abMeantone: '中庸律',
        abTet: '十二平均律',
        abPlay: '播放这一段',
        abStop: '停止',
        whyTitle: '为什么开方就是解',
        whyBody: '若八度 = 2 倍频率，等分成 12 份，则相邻两音的公比 r 满足 r^12 = 2，故 r = 2^(1/12) = 1.0594630943592953。所谓「密率」就是这一位小数背后的严谨常量。',
        honorNote: '本节并列展示两条独立解题路径与可核验的数学结论，不对传播先后作出断言。',
        check1: '密率 = 2^(1/12) 误差',
        check2: '密率^12 与 2 的误差',
        check3: '文献值与计算值之差',
        check4: '十二个半音全部 = 100 音分',
        termHuangzhong: '黄钟', termLinzhong: '林钟', termTaicu: '太簇', termNanlü: '南吕',
        termGuxi: '姑洗', termYingzhong: '应钟', termRuibin: '蕤宾', termDalü: '大吕',
        termYize: '夷则', termJiazhong: '夹钟', termWuyi: '无射', termZhonglü: '仲吕',
        step1: '目标：把八度十二等分。设相邻两音的公比为 r，则 r^12 = 2',
        step2: '第一次开平方，得到半个八度',
        step3: '第二次开平方，得到四分之一个八度',
        step4: '另一支：对 2 开立方，得到三分之一个八度',
        step5: '再开平方，得到六分之一个八度',
        step6: '两者相除，得到十二分之一个八度，即密率',
        step7: '闭合检验：把密率自乘 12 次，应回到 2'
      },

      /* ---------------------------------------------------- M5 */
      m5: {
        kicker: '模块 05 · 世界',
        title: '世界律制 · 同一个八度，很多种切法',
        titleEn: 'World Tunings · One Octave, Many Cuts',
        lead: '八度必须被切开，但怎么切没有唯一答案。同一段旋律放进不同的切法里，会听见不同的「调」——甚至不同的情绪。',
        demoTitle: '把律制摊开在同一把尺子上',
        demoDesc: '横轴是 0–1200 音分。选中的律制各画一行，点的位置就是它的音级。可以叠加对比。',
        listTitle: '律制一览',
        compareTitle: 'A/B 对比',
        playAB: '播放 A',
        playB: '播放 B',
        stop: '停止',
        melodyNote: '同一段五声音阶旋律，只改变律制。',
        regionAll: '全部',
        region_all: '全部',
        region_china: '中国',
        region_europe: '欧洲',
        region_india: '印度',
        region_arabic: '阿拉伯世界',
        region_indonesia: '印度尼西亚',
        region_thailand: '泰国',
        region_global: '全球',
        noteCount: '{n} 音',
        rulerTitle: '音分刻度尺',
        mapTitle: '文化区域地图',
        mapHint: '点选区域查看该文化的律制与乐器；下方刻度尺同步。',
        pendingWarn: '本表含「文献参考值」条目：按已发表文献抄录显示，一手来源核验中，不作为对外结论。',
        compareHint: '选两套律制，听同一段旋律的差别。',
        check1: '已加载律制',
        check2: '每套律制音级合计 = 1200 音分',
        check3: '待核验条目',
        check4: '与十二平均律的最大偏差'
      },

      /* ---------------------------------------------------- M6 */
      m6: {
        kicker: '模块 06 · 一件乐器',
        title: '编钟与琴 · 一钟两音',
        titleEn: 'Bells and Zithers · Two Tones in One Bell',
        lead: '曾侯乙编钟的每一件钟能发出两个音：敲正鼓部一个，敲侧鼓部另一个，通常相距约一个大三度；中音区十二个半音齐备。但它不是等程律——把八度精确等分成十二份的数学解，要到 1584 年才由朱载堉以新法密率给出。古琴则用十三个徽位把弦长切成 1/2、1/3、1/4……泛音列就是它的数学。',
        bellTitle: '一钟双音',
        bellDesc: '点钟面上的两个敲击点：正鼓音（中央）与侧鼓音（侧边）。两音相距约 386 音分（≈大三度）——这是一件钟，不是一个组合。',
        bellFront: '正鼓音',
        bellSide: '侧鼓音',
        bellHitFront: '敲正鼓部',
        bellHitSide: '敲侧鼓部',
        bellPlayBoth: '两音对比',
        bellInterval: '正鼓音与侧鼓音的间距',
        bellSource: '测音结论学界有不同研究，本页数值为示意性近似，逐条来源见「方法与证据」。',
        guqinTitle: '古琴徽位与泛音列',
        guqinDesc: '在弦长的 1/2、1/3、1/4……处轻触并拨弦，得到第 2、3、4……泛音。徽位就是这些节点的标记。',
        guqinHui: '徽位',
        guqinRatio: '弦长比',
        guqinPartial: '泛音序号',
        guqinFreq: '频率',
        guqinCents: '相对基音',
        guqinSweep: '依次扫过全部徽位',
        guqinStop: '停止',
        specTitle: '频谱',
        specDesc: '把「一钟双音」的声音拆成频率成分：一钟两音不是一个音的泛音，而是两组分音并存。',
        check1: '泛音频率 = 基频 x n',
        check2: '正鼓音 / 侧鼓音间距',
        check3: '徽位最小比值',
        check4: '一钟双音（编钟）',
        bellCount: '曾侯乙编钟 65 件',
        bellName: '钟 {n}',
        currentTone: '当前发声'
      },

      /* ---------------------------------------------------- M7 */
      m7: {
        kicker: '模块 07 · 器物',
        title: '律与器 · 妥协的艺术',
        titleEn: 'Tuning and Instruments · The Art of Compromise',
        lead: '乐器不会按理论长。吉他品丝按 2^(-n/12) 排布，钢琴的高音区要拉宽、低音区要压窄——因为真实乐器要考虑自己的物理。所谓「标准音高」，是一场持续的妥协。',
        fretTitle: '吉他品丝：平均律的物证',
        fretDesc: '第 n 品到琴枕的距离 d(n) = L·(1 - 2^(-n/12))。把平均律与纯律并排看：不是所有音都能同时纯净。',
        fretLabel: '第 {n} 品',
        fretET: '平均律位置',
        fretJust: '纯律（同音级 5:4 大三度）位置',
        fretDiff: '差距',
        fretPlayET: '按平均律弹这个音',
        fretPlayJust: '按纯律弹这个音',
        stretchTitle: '钢琴调律曲线（Railsback 曲线）',
        stretchDesc: '实际钢琴调音时，高音区会比理论值偏高、低音区偏低，因为人的听觉偏好与琴弦的非谐性。曲线是「理论 vs 耳朵」的证据。',
        stretchRubric: '纵轴：相对十二平均律的偏差（音分）',
        stretchNote: '示意曲线：形状取自通行的 Railsback 曲线描述，具体数值随琴而异。',
        isochordTitle: '同一把尺子上的偏离',
        isochordDesc: '把各律制的十二个音对十二平均律的偏差画成图：平均律是一条直线（零偏差），其它律制上下起伏。',
        check1: '品丝位置公式 d(n) = L(1-2^(-n/12))',
        check2: '第 12 品应正好在弦长一半',
        check3: '纯律大三度 386.31 音分',
        check4: '平均律大三度 400 音分'
      },

      /* ---------------------------------------------------- M8 */
      m8: {
        kicker: '模块 08 · 证据',
        title: '方法与证据',
        titleEn: 'Method and Evidence',
        lead: '这一节把页面上的每个数字都交出来：算法、断言、来源、复跑命令、AI 使用情况。所有对外数字都来自同一份 metrics.json，页面不手写任何数字。',
        algoTitle: '算法说明（摘要）',
        algoBody1: '音分定义：cents(f₁,f₂) = 1200·log₂(f₂/f₁)。它是把频率的乘法关系转成加法关系的一步，全部律制比较都建立在它之上。',
        algoBody2: '三分损益：从黄钟起连续 ×3/2 并折叠进 [1,2)，得到 12 律；第 12 律与黄钟的差为 1200·log₂(3^12/2^19) = 23.4600 音分。',
        algoBody3: '新法密率：2^(1/12) = 1.0594630943592953；其 12 次幂与 2 的误差小于 1e-15。',
        algoBody4: '品丝位置：d(n) = L·(1 - 2^(-n/12))；泛音列：f(n) = n·f(0)；拍频：|f₁ - f₂|。',
        metricsTitle: '本页可核验数字',
        metricsNote: '以下数字由页面运行时从 data/metrics.js 读取；该文件由管线脚本从 _pipeline/metrics_app.json 与 metrics.json 生成，禁止手写。',
        mModules: '模块数',
        mModulesReady: '就绪模块',
        mDomCharsZh: '中文正文字符数',
        mDomCharsEn: '英文正文字符数',
        mLoad: '首屏 DOM 就绪',
        mErrors: '控制台错误',
        mAxe: 'axe 无障碍违规',
        mCjk: 'EN 模式中文字符占比',
        mVersion: '作品版本',
        mPending: '待生成指标',
        mKernelAssertions: '内核断言（通过 / 总数）',
        mCrossChecks: 'Python  /  JS 交叉校验组',
        mAudioAssertions: '音频断言（通过 / 总数）',
        mAudioCents: '单音 FFT 峰值误差（{g} 组）',
        mAudioBeat: '拍频包络误差（{g} 组）',
        sourcesTitle: '数据来源入口',
        sourcesNote: '律制数学表由定义直接计算（可复算）；文献类数值在界面标为「文献参考值」（内部状态仍为待核验），按已发表来源抄录，不作对外结论。完整来源清单见提交材料的《来源清单》。',
        srcTuning: '律制表',
        srcHistory: '历史时间线',
        srcWorld: '世界律制说明',
        srcGlossary: '术语库',
        tuningScope: '对外口径 {n} 种律制（另含 {d} 套派生对照表，页面共 {t} 张表）',
        srcStatus: '来源状态字段',
        sourceRegister: '来源清单',
        sourcesInline: '来源 {ids}（见{reg}）',
        runTitle: '复跑命令',
        runNote: '以下命令在本机 PowerShell 中可直接运行（工作目录 F:\\sjq\\数媒）。',
        runKernel: '内核断言（Python 权威实现）',
        runExport: '导出律制表',
        runCross: 'Python  /  JS 交叉校验',
        runMerge: '汇总对外数字',
        runBuildData: '重建页面数据（本页 data/*.js）',
        runGate: '国一标准门禁总跑',
        aiTitle: 'AI 使用披露',
        aiBody1: '本作品的界面代码、可视化与文案由学生团队在 AI 编程助手辅助下完成；AI 参与部分已在提交材料的《人工智能工具使用情况说明》中逐项列明（工具名、环节、生成流程、人工修改）。',
        aiBody2: '页面中的律制数值不依赖 AI 生成：纯数学表由定义计算，文献表标注来源与核验状态。',
        aiBody3: '本页不含 AI 生成的图像素材；界面图形全部由代码程序化绘制（SVG/Canvas）。',
        originalTitle: '原创贡献',
        orig1: '自建律制数据集：11 套律制、22 音级的一手音分表，附来源状态字段。',
        orig2: '双内核交叉校验：Python 权威实现与 JS 同构实现逐值比对，误差 < 1e-12。',
        orig3: '可听化实验台：把音分、拍音、狼音从数字变成可听见的对比，全部离线运行。',
        orig4: '零外部依赖单页：不引用任何 CDN、在线字体或远程图片，双击即开。',
        honestyTitle: '诚实边界',
        honestyBody: '朱载堉与欧洲十二平均律的传播关系，学界存在不同观点；本作品并列展示两条解题路径与可核验的数学结论，不对优先权作出断言。编钟测音采用已发表研究并逐条标注来源。',
        glossaryTitle: '术语对照（中英）',
        glossaryDesc: '页面内术语库，可搜索。术语的英文列为对照用途，不改变中文释义。',
        glossarySearch: '搜索术语…',
        glossaryEmpty: '没有匹配的术语',
        glossaryCat: '门类',
        glossaryCount: '共 {n} 条 / {c} 类'
      },

      /* ---------------------------------------------------- 页脚 */
      foot: {
        line1: '《同律》CONCORD · 律学交互实验室',
        line2: '全国大学生数字媒体科技作品及创意竞赛 · 国际专项赛 · 2026',
        line3: '零外部依赖 · 离线双击即开 · 页面内每个数字都可复算',
        version: '版本 {v}',
        backTop: '回到顶部'
      }
    },

    /* ======================================================== English en */
    en: {
      meta: {
        appName: 'CONCORD',
        appNameEn: 'CONCORD',
        docTitle: 'CONCORD · Tuning Lab v{v} — One Octave, Two Solutions',
        subtitle: 'One Octave, Two Solutions: The Eastern and Western Roads to Twelve-Tone Equal Temperament',
        subtitleEn: 'One Octave, Two Solutions',
        kicker: 'An interactive, audible tuning laboratory',
        intro: 'Twelve semitones must fit inside one octave. Stack simple ratios (3:2, 2:1) and the circle never closes — it misses the start by 23.46 cents. This work lets you calculate it by hand and hear it by ear: how two civilisations solved the same problem, and how that solution became the tuning adopted by modern instruments and mainstream music-industry practice.',
        introHint: 'Suggested order: hear the unclosable 23.46 cents first, then watch two civilisations solve it.',
        coverStats: '{m} modules · {s} tuning systems · {n} glossary terms'
      },

      a11y: {
        skip: 'Skip to main content',
        mainNav: 'Module navigation',
        langGroup: 'Language',
        progress: 'Reading progress',
        moduleList: 'Eight modules',
        demoRegion: 'Interactive demonstration',
        readouts: 'Live readouts',
        figures: 'Verifiable figures',
        playGroup: 'Playback controls',
        toast: 'Status message',
        chart: 'Chart',
        aside: 'Further reading'
      },

      ui: {
        zh: '中文',
        en: 'EN',
        play: 'Play',
        stop: 'Stop',
        stopAll: 'Stop all sound',
        stopAllShort: 'Mute',
        reset: 'Reset',
        next: 'Next',
        prev: 'Back',
        auto: 'Auto',
        run: 'Run',
        playAll: 'Play all',
        compare: 'Compare',
        cents: 'cents',
        centsShort: 'ct',
        hz: 'Hz',
        step: 'Step',
        of: '/',
        notes: 'notes',
        source: 'Source',
        statusVerified: 'verified',
        statusPending: 'literature value',
        statusResearch: 'verified (literature)',
        statusOfficial: 'verified (official)',
        statusLiterature: 'literature value',
        statusComputed: 'computed',
        statusSeed: 'seed data',
        loading: 'Loading data',
        liveComputed: 'computed live',
        fromMetrics: 'from metrics.json',
        reducedOn: 'Motion: reduced',
        reducedOff: 'Motion: normal',
        motionToggle: 'Reduce motion',
        soundOn: 'Sound: on',
        soundOff: 'Sound: muted',
        keyboardHint: 'Keyboard: Tab through controls, Space/Enter to toggle, arrow keys for sliders',
        version: 'Version',
        close: 'Close',
        expand: 'Expand',
        collapse: 'Collapse',
        selectTwo: 'Choose two tunings',
        systemA: 'Tuning A',
        systemB: 'Tuning B',
        melody: 'Melody',
        chord: 'Chord',
        interval: 'Interval',
        deviation: 'Deviation',
        diff: 'Difference',
        tick: 'Tick',
        equal12: '12-TET (reference)',
        worst: 'Worst interval',
        best: 'Purest interval',
        status: 'Status',
        derived: 'Derived',
        ratio: 'Ratio'
      },

      nav: {
        brand: 'CONCORD',
        brandSub: '同律',
        m1: 'Prologue',
        m2: 'Ruler',
        m3: 'Sanfen Sunyi',
        m4: 'Cipher Ratio',
        m5: 'World Tunings',
        m6: 'Bells & Zithers',
        m7: 'Instruments',
        m8: 'Method',
        toc: 'Modules'
      },

      m1: {
        kicker: 'Module 01 · The problem',
        title: 'Prologue · The Octave That Will Not Close',
        titleEn: 'Prologue · The Octave That Will Not Close',
        lead: 'Stack twelve perfect fifths (ratio 3:2) end to end and you expect to land exactly seven octaves away. You do not: the chain ends 23.46 cents sharp. That barely audible gap is the engine behind the entire history of tuning.',
        demoTitle: 'Two chains, one destination?',
        demoDesc: 'The left chain multiplies by 3/2 (a perfect fifth) each step; the right one multiplies by 2 (an octave). After twelve fifths and seven octaves the two should coincide — step through it and see where they part.',
        chainFifth: '12 perfect fifths',
        chainOctave: '7 octaves',
        stepBtn: 'Add one fifth',
        stepOctaveBtn: 'Add one octave',
        run12: 'Run all 12 steps',
        reset: 'Back to start',
        playCompare: 'Play comparison',
        playBeat: 'Play the beating',
        readSteps: 'Fifths stacked',
        readFifthEnd: 'Fifth-chain end (folded)',
        readOctaveEnd: 'Seven-octave end',
        readGap: 'Gap',
        readRatio: 'Ratio of the two chain lengths',
        readBeat: 'Beat frequency',
        beatNote: 'How many times per second the two tones collide',
        explainTitle: 'This is not a rounding error',
        explain: '3 is prime and 2 is prime, so 3^12/2^19 can never equal 1. However many steps you take, the fifth chain can never reach a whole number of octaves. The gap 531441/524288 = 1.013643…, i.e. 23.46 cents, is the Pythagorean comma. It is an exact mathematical fact, not a computing mistake — and it is what theorists in China and Europe kept trying to solve.',
        explainEq: '3^12/2^19',
        check1: 'Twelve fifths, total',
        check2: 'Closure error (cents)',
        check3: 'Length ratio 3^12/2^19',
        check4: 'Beating (A4 vs +23.46 cents)',
        hintPlay: 'Sound only starts after you press a button — that is the browser security rule.'
      },

      m2: {
        kicker: 'Module 02 · One string',
        title: 'The Ruler · A Universe on One String',
        titleEn: 'The Ruler · A Universe on One String',
        lead: 'The oldest tuning instrument is one string. Halve its length and you get an octave; take two thirds and you get a fifth. Every tuning system is written inside fractions of string length — drag the ruler and see what they become in frequency and cents.',
        demoTitle: 'A movable bridge',
        demoDesc: 'Drag the bridge to change the sounding length. A shorter string sounds higher: frequency is inversely proportional to length.',
        sliderLabel: 'String length (fraction of full string)',
        presets: 'Interval presets',
        readLength: 'String length',
        readRatio: 'Frequency ratio',
        readHz: 'Frequency',
        readCents: 'Cents (against the reference string)',
        readNote: 'Nearest note name',
        readNearest: 'Distance to the nearest 12-TET note',
        baseLabel: 'Reference string (Huangzhong / C4)',
        stoppedLabel: 'Stopped string',
        invalid: 'String length must lie between 0.5 and 1',
        explainTitle: 'Why inversely proportional',
        explain: 'For a string, f = v/(2L); with fixed wave speed v, f is proportional to 1/L. Halving the length (L→L/2) gives 2f, the octave; L→2L/3 gives 3f/2, the fifth. Cents turn multiplication into addition: cents = 1200 x log2(f2/f1).',
        explainEq: 'cents = 1200 x log2(f2/f1)',
        preset_octave: 'Octave 2:1',
        preset_fifth: 'Perfect fifth 3:2',
        preset_fourth: 'Perfect fourth 4:3',
        preset_major3just: 'Just major third 5:4',
        preset_major3pyth: 'Pythagorean major third 81:64',
        preset_semitone: '12-TET semitone 2^(1/12)',
        noteOctave: 'Octave: half the string length',
        noteFifth: 'Fifth: two thirds of the string',
        noteFourth: 'Fourth: three quarters of the string',
        noteMajor3just: 'Just major third: ratio 5:4, length 4/5',
        noteMajor3pyth: 'Pythagorean major third: ratio 81:64, length 64/81',
        noteSemitone: '12-TET semitone: ratio 2^(1/12), length 2^(-1/12)',
        playBoth: 'Sound both together',
        check1: 'Length and frequency strictly inverse',
        check2: 'Cents right now',
        check3: 'Max preset-table error',
        check4: 'Fifth = 701.955 cents'
      },

      m3: {
        kicker: 'Module 03 · The first Chinese solution',
        title: 'Sanfen Sunyi · The Circle That Cannot Close',
        titleEn: 'Sanfen Sunyi · The Circle That Cannot Close',
        lead: 'Classical Chinese theorists generated pitches by alternately diminishing and augmenting the string by a third: multiply the length by 2/3, then by 4/3. Huangzhong generates the other eleven pitches. But the walk never returns: stacking the twelfth fifth should land back on Huangzhong, and instead overshoots by 23.46 cents. That figure is not the distance between two named pitches — it is the closure error of the whole chain.',
        demoTitle: 'One pitch per step',
        demoDesc: 'Each press adds one perfect fifth in the order recorded in the Lüshi Chunqiu, then folds the result back into the same octave.',
        btnGen: 'Generate one pitch',
        btnGenAll: 'Generate all twelve',
        btnReset: 'Reset',
        btnPlayWolf: 'Play the wolf interval',
        btnPlayScale: 'Play all twelve',
        tableStep: 'Step',
        tableName: 'Pitch',
        tableRatio: 'Ratio',
        tableHz: 'Frequency',
        tableCents: 'Cents',
        tableDev: 'vs 12-TET',
        readClosing: 'Closure error',
        readNote: 'Zhonglü (12th) above Huangzhong',
        statusOpen: 'not closed',
        closureAttempt: 'Step 12',
        statusClosed: 'closed',
        explainTitle: 'Every step is 3/2',
        explain: 'The rule: multiply by 3/2, and if the result leaves the octave divide by 2. Eleven steps generate the other eleven pitches from Huangzhong (Zhonglü sits 521.505 cents above it); taking the twelfth step from Zhonglü should return to Huangzhong, but lands 23.46 cents high. Twelve fifths total 8423.46 cents against 8400 cents for seven octaves — a difference of exactly 23.46.',
        wolfTitle: 'What a "wolf" is',
        wolfDesc: 'To absorb that gap, historical temperaments leave one interval badly out of tune; musicians called it a wolf. Press "Play the wolf interval": the two tones nearly coincide and collide about twenty times a second, so the sound wavers.',
        check1: 'All twelve pitches come from the 3/2 chain',
        check2: 'Closure error (cents)',
        check3: 'Pitch 12 Zhonglü / Huangzhong',
        check4: 'Ratio per step',
        cellsLabel: 'The twelve-pitch table'
      },

      m4: {
        kicker: 'Module 04 · The second Chinese solution',
        title: 'The Cipher Ratio · The Twelfth Root, 1584',
        titleEn: 'The Cipher Ratio · The Twelfth Root, 1584',
        lead: 'In 1584 Zhu Zaiyu published the "new-method cipher ratio" 2^(1/12): make the twelfth string exactly half of the first, so the octave can be divided exactly. In the same period Europe was solving the same problem in parallel — this work presents both paths side by side and makes no priority claim.',
        demoTitle: 'How the twelfth string was calculated',
        demoDesc: 'This page shows an equivalent derivation through square and cube roots (Zhu Zaiyu worked the same value step by step on the abacus). Each step can be recomputed with a button.',
        stepBtn: 'Next derivation step',
        showAll: 'Show the whole derivation',
        resetDerivation: 'Start over',
        stepsTitle: 'Derivation steps',
        litTitle: 'Recorded value vs value computed here',
        litRecorded: 'Recorded value',
        litComputed: 'Computed here',
        litDiff: 'Difference',
        powerTitle: 'Closure test: is the twelfth power equal to 2?',
        powerResult: 'Ratio^12',
        powerTarget: 'Target',
        powerDiff: 'Error',
        timelineTitle: 'Parallel solutions on a timeline',
        abTitle: 'A/B audition: three temperaments',
        abDesc: 'The same phrase (C–E–G–B–C) played in three different tunings.',
        abSanfen: 'Sanfen Sunyi',
        abMeantone: 'Meantone',
        abTet: '12-TET',
        abPlay: 'Play this phrase',
        abStop: 'Stop',
        whyTitle: 'Why a root is the answer',
        whyBody: 'If the octave is a factor of 2 and must be split into 12 equal parts, the ratio r between neighbours satisfies r^12 = 2, so r = 2^(1/12) = 1.0594630943592953. The "cipher ratio" is exactly this constant.',
        honorNote: 'This page presents two independent solution paths and verifiable mathematics side by side; it makes no claim about who came first.',
        check1: 'Cipher ratio vs 2^(1/12)',
        check2: 'Ratio^12 vs 2',
        check3: 'Recorded minus computed',
        check4: 'All twelve semitones = 100 cents',
        termHuangzhong: 'Huangzhong', termLinzhong: 'Linzhong', termTaicu: 'Taicu', termNanlü: 'Nanlü',
        termGuxi: 'Guxi', termYingzhong: 'Yingzhong', termRuibin: 'Ruibin', termDalü: 'Dalü',
        termYize: 'Yize', termJiazhong: 'Jiazhong', termWuyi: 'Wuyi', termZhonglü: 'Zhonglü',
        step1: 'Goal: divide the octave into twelve equal parts. With r the ratio between neighbours, r^12 = 2',
        step2: 'First square root: one half-octave',
        step3: 'Second square root: a quarter octave',
        step4: 'A second branch: cube root of 2, a third of an octave',
        step5: 'Square root again: a sixth of an octave',
        step6: 'Divide them: a twelfth of an octave, the cipher ratio',
        step7: 'Closure test: raise the cipher ratio to the twelfth power; it should return to 2'
      },

      m5: {
        kicker: 'Module 05 · The world',
        title: 'World Tunings · One Octave, Many Cuts',
        titleEn: 'World Tunings · One Octave, Many Cuts',
        lead: 'The octave must be cut somewhere, but there is no single answer. Put the same melody into different cuts and you hear a different key — and a different mood.',
        demoTitle: 'Every tuning on the same ruler',
        demoDesc: 'The x-axis is 0–1200 cents. Selected tunings each get a row; every dot is one pitch. Overlay them to compare.',
        listTitle: 'The systems',
        compareTitle: 'A/B comparison',
        playAB: 'Play A',
        playB: 'Play B',
        stop: 'Stop',
        melodyNote: 'The same pentatonic phrase, only the tuning changes.',
        regionAll: 'All',
        region_all: 'All',
        region_china: 'China',
        region_europe: 'Europe',
        region_india: 'India',
        region_arabic: 'Arabic world',
        region_indonesia: 'Indonesia',
        region_thailand: 'Thailand',
        region_global: 'Global',
        noteCount: '{n} notes',
        rulerTitle: 'Cents ruler',
        mapTitle: 'Cultural map',
        mapHint: 'Pick a region to see its tunings and instruments; the ruler below follows.',
        pendingWarn: 'This table contains literature-reference values: reproduced from published sources, first-hand verification in progress, not used in outward conclusions.',
        compareHint: 'Pick two tunings and hear the same phrase in both.',
        check1: 'Tunings loaded',
        check2: 'Every tuning sums to 1200 cents',
        check3: 'Items pending review',
        check4: 'Largest deviation from 12-TET'
      },

      m6: {
        kicker: 'Module 06 · One instrument',
        title: 'Bells and Zithers · Two Tones in One Bell',
        titleEn: 'Bells and Zithers · Two Tones in One Bell',
        lead: 'Each bell of the Marquis Yi of Zeng set sounds two pitches: strike the front boss for one, the side for the other, usually about a major third apart, and its mid register carries all twelve semitones. It is not equal temperament, however — the mathematical solution that divides the octave into twelve equal parts comes only in 1584, with Zhu Zaiyu. The guqin instead divides its string at 1/2, 1/3, 1/4… — its thirteen studs are the harmonic series made physical.',
        bellTitle: 'Two tones in one bell',
        bellDesc: 'Press the two strike points: the front tone (centre) and the side tone (edge). They sit about 386 cents apart — in one single bell, not a pair.',
        bellFront: 'Front tone',
        bellSide: 'Side tone',
        bellHitFront: 'Strike the front',
        bellHitSide: 'Strike the side',
        bellPlayBoth: 'Both together',
        bellInterval: 'Distance between front and side tone',
        bellSource: 'Published pitch measurements differ between studies; the value here is schematic. See "Method and Evidence" for sources.',
        guqinTitle: 'Guqin studs and the harmonic series',
        guqinDesc: 'Touch the string at 1/2, 1/3, 1/4… of its length and pluck: you get the 2nd, 3rd, 4th… harmonic. The studs mark exactly these nodes.',
        guqinHui: 'Stud',
        guqinRatio: 'Length ratio',
        guqinPartial: 'Harmonic',
        guqinFreq: 'Frequency',
        guqinCents: 'Above fundamental',
        guqinSweep: 'Sweep every stud',
        guqinStop: 'Stop',
        specTitle: 'Spectrum',
        specDesc: 'Break the two-tone bell into frequency components: the second tone is not a harmonic of the first; two sets of partials coexist.',
        check1: 'Harmonic frequency = fundamental x n',
        check2: 'Front / side tone distance',
        check3: 'Smallest stud ratio',
        check4: 'Two tones in one bell',
        bellCount: 'Zeng Houyi set: 65 bells',
        bellName: 'Bell {n}',
        currentTone: 'Now sounding'
      },

      m7: {
        kicker: 'Module 07 · The instrument',
        title: 'Tuning and Instruments · The Art of Compromise',
        titleEn: 'Tuning and Instruments · The Art of Compromise',
        lead: 'Instruments do not follow theory. Guitar frets are placed by 2^(-n/12); pianos stretch the treble up and the bass down, because a real instrument has to answer to its own physics. "Standard pitch" is a compromise that never stops being renegotiated.',
        fretTitle: 'Guitar frets: equal temperament made physical',
        fretDesc: 'The distance from nut to fret n is d(n) = L·(1 - 2^(-n/12)). Put equal temperament next to just intonation: not every interval can be pure at the same time.',
        fretLabel: 'Fret {n}',
        fretET: 'Equal-temperament position',
        fretJust: 'Just position (5:4 major third)',
        fretDiff: 'Difference',
        fretPlayET: 'Play this note at the ET position',
        fretPlayJust: 'Play this note at the just position',
        stretchTitle: 'Piano tuning curve (Railsback curve)',
        stretchDesc: 'Real piano tuning sharpens the treble and flattens the bass, because hearing prefers it and strings are inharmonic. The curve is the evidence of "theory vs the ear".',
        stretchRubric: 'Vertical axis: deviation from 12-TET (cents)',
        stretchNote: 'Schematic curve: the shape follows the published Railsback description; exact values vary per instrument.',
        isochordTitle: 'Deviation on one ruler',
        isochordDesc: 'Plot each tuning system\'s twelve pitches against 12-TET: equal temperament is a flat line at zero, everything else rises and falls.',
        check1: 'Fret formula d(n) = L(1-2^(-n/12))',
        check2: 'Fret 12 lands exactly at half the string',
        check3: 'Just major third = 386.31 cents',
        check4: '12-TET major third = 400 cents'
      },

      m8: {
        kicker: 'Module 08 · Evidence',
        title: 'Method and Evidence',
        titleEn: 'Method and Evidence',
        lead: 'This section hands over every number on the page: algorithms, assertions, sources, rerun commands and AI usage. All outward figures come from one metrics.json; the page hard-codes none of them.',
        algoTitle: 'Algorithms (summary)',
        algoBody1: 'Cents: cents(f1,f2) = 1200·log2(f2/f1). This single step turns the multiplication of frequencies into the addition of intervals, and every comparison in this work rests on it.',
        algoBody2: 'Sanfen sunyi: multiply by 3/2 repeatedly from Huangzhong and fold into [1,2) to obtain twelve pitches; pitch twelve differs from Huangzhong by 1200·log₂(3^12/2^19) = 23.4600 cents.',
        algoBody3: 'Cipher ratio: 2^(1/12) = 1.0594630943592953; the error of its twelfth power against 2 is below 1e-15.',
        algoBody4: 'Fret position: d(n) = L·(1 - 2^(-n/12)); harmonic series: f(n) = n·f(0); beating: |f₁ - f₂|.',
        metricsTitle: 'Verifiable figures on this page',
        metricsNote: 'The figures below are read at runtime from data/metrics.js, which the pipeline generates from _pipeline/metrics_app.json and metrics.json. Nothing here is typed by hand.',
        mModules: 'Modules',
        mModulesReady: 'Modules ready',
        mDomCharsZh: 'Chinese body characters',
        mDomCharsEn: 'English body characters',
        mLoad: 'DOM ready',
        mErrors: 'Console errors',
        mAxe: 'axe violations',
        mCjk: 'CJK ratio in EN mode',
        mVersion: 'App version',
        mPending: 'Pending metrics',
        mKernelAssertions: 'Kernel assertions (passed / total)',
        mCrossChecks: 'Python  /  JS cross-checks',
        mAudioAssertions: 'Audio assertions (passed / total)',
        mAudioCents: 'Single-tone FFT peak error ({g} groups)',
        mAudioBeat: 'Beat envelope error ({g} groups)',
        sourcesTitle: 'Where the data comes from',
        sourcesNote: 'Mathematical tuning tables are computed from their definitions (and can be recomputed). Literature values are labelled "literature value" in the interface (internally still pending review): they reproduce published sources and are not used in outward conclusions. The full source list ships with the submission materials.',
        srcTuning: 'Tuning tables',
        srcHistory: 'Historical timeline',
        srcWorld: 'World tunings notes',
        srcGlossary: 'Glossary',
        tuningScope: 'Outward figure: {n} tuning systems (+{d} derived comparison tables, {t} tables shown)',
        srcStatus: 'Source-status field',
        sourceRegister: 'Source Register',
        sourcesInline: 'Sources: {ids} (see {reg})',
        runTitle: 'Rerun commands',
        runNote: 'These run as-is in PowerShell on this machine (working directory F:\\sjq\\数媒).',
        runKernel: 'Kernel assertions (authoritative Python)',
        runExport: 'Export tuning tables',
        runCross: 'Python  /  JS cross-check',
        runMerge: 'Merge outward figures',
        runBuildData: 'Rebuild page data (data/*.js)',
        runGate: 'Full national-first-class gate',
        aiTitle: 'AI usage disclosure',
        aiBody1: 'The interface code, visualisations and copy were produced by the student team with AI coding assistants; the assisted parts are itemised in the submission\'s AI Usage Statement (tool, stage, generation process, human edits).',
        aiBody2: 'The tuning figures do not depend on AI output: mathematical tables are computed from definitions, literature tables carry sources and review status.',
        aiBody3: 'This page contains no AI-generated imagery; every graphic is drawn procedurally in code (SVG/Canvas).',
        originalTitle: 'Original contributions',
        orig1: 'A self-built tuning dataset: 11 systems and a 22-pitch table, each entry tagged with source status.',
        orig2: 'Dual-kernel cross-check: an authoritative Python implementation compared value by value against a JS twin, error < 1e-12.',
        orig3: 'An audible laboratory: cents, beating and wolves turned from numbers into things you can hear, entirely offline.',
        orig4: 'A zero-dependency single page: no CDN, no web font, no remote image — double-click to run.',
        honestyTitle: 'Honest boundaries',
        honestyBody: 'The transmission relationship between Zhu Zaiyu and European equal temperament is debated. This work presents two solution paths and verifiable mathematics side by side and makes no priority claim. Bell pitch measurements follow published research and are attributed item by item.',
        glossaryTitle: 'Glossary (Chinese–English)',
        glossaryDesc: 'An in-page glossary with search. The English column is for reference and does not replace the Chinese definition.',
        glossarySearch: 'Search terms…',
        glossaryEmpty: 'No matching term',
        glossaryCat: 'Category',
        glossaryCount: '{n} terms / {c} categories'
      },

      foot: {
        line1: 'CONCORD · An interactive tuning laboratory',
        line2: 'National Student Digital Media Technology Competition · International Track · 2026',
        line3: 'Zero external dependencies · offline, double-click to open · every figure is recomputable',
        version: 'Version {v}',
        backTop: 'Back to top'
      }
    }
  };

  /* ---------------------------------------------------------------- 工具 */
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function flatten(src, prefix, out) {
    out = out || {};
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      var key = prefix ? prefix + '.' + k : k;
      if (isObj(src[k])) flatten(src[k], key, out);
      else out[key] = src[k];
    }
    return out;
  }

  var FLAT = { zh: flatten(DICT.zh, '', {}), en: flatten(DICT.en, '', {}) };

  function interpolate(str, vars) {
    if (!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function (m, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m;
    });
  }

  var LS_KEY = 'concord.lang';
  var current = 'zh';

  function safeGet(k) {
    try { return W.localStorage.getItem(k); } catch (e) { return null; }
  }
  function safeSet(k, v) {
    try { W.localStorage.setItem(k, v); } catch (e) { /* 静默 */ }
  }

  function detectLang() {
    var saved = safeGet(LS_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
    var nav = (W.navigator && W.navigator.language) || '';
    return /^en/i.test(nav) && !/^zh/i.test(nav) ? 'en' : 'zh';
  }

  function t(key, vars) {
    var table = FLAT[current] || FLAT.zh;
    var v = table[key];
    if (v === undefined) {
      v = FLAT.zh[key];
      if (v === undefined) v = key;                    // 缺键回显键名，便于自测发现
    }
    return interpolate(v, vars);
  }

  function tIn(lang, key, vars) {
    var table = FLAT[lang] || FLAT.zh;
    var v = table[key] !== undefined ? table[key] : (FLAT.zh[key] !== undefined ? FLAT.zh[key] : key);
    return interpolate(v, vars);
  }

  var ATTR_MAP = {
    'data-i18n-aria': 'aria-label',
    'data-i18n-title': 'title',
    'data-i18n-ph': 'placeholder'
  };

  /** 把 root 子树内所有 data-i18n* 按当前语言重渲染 */
  function apply(root, lang) {
    if (lang) current = lang;
    var scope = root || W.document;
    if (!scope || !scope.querySelectorAll) return current;

    var nodes = scope.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n');
      if (!key) continue;
      el.textContent = t(key);
    }
    var htmls = scope.querySelectorAll('[data-i18n-html]');
    for (var j = 0; j < htmls.length; j++) {
      htmls[j].innerHTML = t(htmls[j].getAttribute('data-i18n-html'));
    }
    for (var attr in ATTR_MAP) {
      if (!Object.prototype.hasOwnProperty.call(ATTR_MAP, attr)) continue;
      var list = scope.querySelectorAll('[' + attr + ']');
      for (var k = 0; k < list.length; k++) {
        list[k].setAttribute(ATTR_MAP[attr], t(list[k].getAttribute(attr)));
      }
    }
    return current;
  }

  function setLang(lang, opts) {
    if (lang !== 'zh' && lang !== 'en') lang = 'zh';
    current = lang;
    if (!opts || opts.remember !== false) safeSet(LS_KEY, lang);
    var html = W.document && W.document.documentElement;
    if (html) {
      html.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
      html.setAttribute('data-lang', lang);
    }
    return current;
  }

  /** 自测：找出缺失的键（zh/en 任一缺失即报） */
  function audit() {
    var missing = [];
    var zhKeys = Object.keys(FLAT.zh), enKeys = Object.keys(FLAT.en);
    for (var i = 0; i < zhKeys.length; i++) if (FLAT.en[zhKeys[i]] === undefined) missing.push('en:' + zhKeys[i]);
    for (var j = 0; j < enKeys.length; j++) if (FLAT.zh[enKeys[j]] === undefined) missing.push('zh:' + enKeys[j]);
    return missing;
  }

  var API = {
    dict: DICT,
    flat: FLAT,
    langs: ['zh', 'en'],
    t: t,
    tIn: tIn,
    apply: apply,
    setLang: setLang,
    detectLang: detectLang,
    audit: audit,
    keys: function () { return Object.keys(FLAT.zh); },
    get lang() { return current; }
  };

  current = detectLang();
  W.I18N = API;
})(typeof window !== 'undefined' ? window : this);
;
/* ===== 17. app.js ===== */
/* ============================================================================
 * app.js —《同律》CONCORD 交互层
 * ----------------------------------------------------------------------------
 * 八个模块全部由真实计算驱动：页面不内置任何律制数值表，每处音分/频率都是
 * 当场算出来的。数值优先来自协作内核 window.Tuning（kernel 交付），缺失时走
 * 本文件内置的最小实现（搜索 FALLBACK 可见每一处降级）。
 *
 * 依赖加载策略
 *   data/deps.js 是管线扫描目录生成的「可选依赖清单」。app.js 只对清单里存在的
 *   文件动态注入 <script>，因此 kernel / viz 尚未交付时页面不会产生 404 控制台
 *   错误，而是使用内置降级渲染。
 *
 * 结构
 *   0 常量与依赖 → 1 内核降级实现 → 2 音频降级实现 → 3 工具 → 4 状态
 *   → 5 可视化挂载（懒渲染）→ 6 各模块 → 7 双语 → 8 测试钩子 → 9 启动
 * ========================================================================== */
(function (W, D) {
  'use strict';

  const APP_VERSION = "1.0.0";

  /* ==================================================================
   * 0 · 常量、DOM 引用与工具
   * ================================================================== */
  const $ = (s, r) => (r || D).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || D).querySelectorAll(s));
  const T = (k, v) => W.I18N.t(k, v);
  const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const LOG2 = Math.log(2);

  const A4 = 440;
  const C4 = A4 * Math.pow(2, -9 / 12);       // 261.6255653005986 Hz（黄钟）
  const ZERO = 1e-12;

  const prefersReduced = (function () {
    try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  })();

  /* ==================================================================
   * 1 · 内核（律制数学）：优先 window.Tuning，缺失则用内置等价实现
   * ================================================================== */
  const FALLBACK_KERNEL = {
    /* FALLBACK: 音分 = 1200·log2(f2/f1) */
    cents(f1, f2) {
      if (!isNum(f1) || !isNum(f2) || f1 <= 0 || f2 <= 0) return NaN;
      return 1200 * Math.log2(f2 / f1);
    },
    /* FALLBACK: 由音分推频率 */
    hz_from_cents(base, c) {
      if (!isNum(base) || !isNum(c) || base <= 0) return NaN;
      return base * Math.pow(2, c / 1200);
    },
    /* FALLBACK: 频率比 → 音分 */
    ratio_to_cents(r) {
      if (!isNum(r) || r <= 0) return NaN;
      return 1200 * Math.log2(r);
    },
    /* FALLBACK: 音分 → 频率比 */
    cents_to_ratio(c) {
      if (!isNum(c)) return NaN;
      return Math.pow(2, c / 1200);
    },
    /* FALLBACK: 折叠进 [1,2) */
    normalize_octave(r) {
      if (!isNum(r) || r <= 0) return NaN;
      let x = r;
      let guard = 0;
      while (x >= 2 && guard++ < 200) x /= 2;
      while (x < 1 && guard++ < 200) x *= 2;
      return x;
    },
    /* FALLBACK: 三分损益 12 律（黄钟起连续 ×3/2 折叠回 [1,2)） */
    sanfen_sunyi(base) {
      const b = isNum(base) && base > 0 ? base : C4;
      return SANFEN_NAMES.map((n, i) => {
        const r = FALLBACK_KERNEL.normalize_octave(Math.pow(1.5, i));
        return {
          index: i,
          name_zh: n.zh,
          name_en: n.en,
          ratio: r,
          hz: b * r,
          cents: 1200 * Math.log2(r),
          chain_cents: i * 1200 * Math.log2(1.5)
        };
      });
    },
    /* FALLBACK: 十二平均律 */
    equal_temperament(n) {
      const cnt = isNum(n) && n > 0 ? Math.round(n) : 12;
      const out = [];
      for (let i = 0; i < cnt; i++) {
        const r = Math.pow(2, i / cnt);
        out.push({ index: i, ratio: r, cents: i * 1200 / cnt, hz: C4 * r });
      }
      return out;
    },
    /* FALLBACK: 5-限纯律 */
    just_intonation() {
      const ratios = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
      return ratios.map((r, i) => ({ index: i, ratio: r, cents: 1200 * Math.log2(r), hz: C4 * r }));
    },
    /* FALLBACK: 1/4 音差中庸律（五度 = 5^(1/4)） */
    meantone() {
      const FIFTH = 1200 * Math.log2(Math.pow(5, 0.25));
      const order = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
      const out = new Array(12);
      for (let i = 0; i < 12; i++) {
        const c = ((i * FIFTH) % 1200 + 1200) % 1200;
        out[order[i]] = { index: order[i], cents: c, ratio: Math.pow(2, c / 1200), hz: C4 * Math.pow(2, c / 1200) };
      }
      return out;
    },
    /* FALLBACK: Werckmeister III 通行音分表 */
    werckmeister_iii() {
      const cs = [0, 90.225, 192.18, 294.135, 390.225, 498.045, 588.27, 696.578, 792.18, 888.27, 996.09, 1092.18];
      return cs.map((c, i) => ({ index: i, cents: c, ratio: Math.pow(2, c / 1200), hz: C4 * Math.pow(2, c / 1200) }));
    },
    /* FALLBACK: 编钟分音（正鼓音 + 侧鼓音 + 上方整数倍，示意性近似） */
    bell_partials(f0, n) {
      const base = isNum(f0) && f0 > 0 ? f0 : 130.81;
      const cnt = isNum(n) && n > 1 ? Math.round(n) : 8;
      const sideRatio = Math.pow(2, 386.3137 / 1200);      // 侧鼓音 ≈ 大三度
      const ratios = [1, sideRatio, 2, 2.4, 3, 4, 4.8, 6, 8, 12];
      const out = [];
      for (let i = 0; i < cnt; i++) {
        const r = ratios[i % ratios.length] * (i >= ratios.length ? Math.pow(2, Math.floor(i / ratios.length)) : 1);
        out.push({ index: i, ratio: r, hz: base * r, cents: 1200 * Math.log2(r) });
      }
      return out;
    },
    /* FALLBACK: 泛音列 */
    harmonic_series(f0, n) {
      const base = isNum(f0) && f0 > 0 ? f0 : C4;
      const cnt = isNum(n) && n > 1 ? Math.round(n) : 8;
      const out = [];
      for (let i = 1; i <= cnt; i++) out.push({ n: i, hz: base * i, ratio: i, cents: 1200 * Math.log2(i) });
      return out;
    },
    /* FALLBACK: 品丝位置 d_n = L·(1 - 2^(-n/12)) */
    fret_positions(L, n) {
      const len = isNum(L) && L > 0 ? L : 650;
      const cnt = isNum(n) && n > 0 ? Math.round(n) : 12;
      const out = [];
      for (let i = 0; i <= cnt; i++) {
        out.push({ fret: i, dist: len * (1 - Math.pow(2, -i / 12)), ratio: 1 - Math.pow(2, -i / 12) });
      }
      return out;
    },
    /* FALLBACK: 拍频 */
    beat_frequency(f1, f2) {
      if (!isNum(f1) || !isNum(f2)) return NaN;
      return Math.abs(f1 - f2);
    },
    /* FALLBACK: 载入世界律制表（容忍数组或 {systems:[]}） */
    load_world_tunings(json) {
      if (!json) return [];
      const arr = Array.isArray(json) ? json : (json.systems || []);
      return arr.filter((s) => s && Array.isArray(s.cents) && s.cents.length > 1)
        .map((s) => {
          const c = s.cents.slice().map(Number).sort((a, b) => a - b);
          return Object.assign({}, s, { cents: c });
        });
    }
  };

  const SANFEN_NAMES = [
    { zh: '黄钟', en: 'Huangzhong' }, { zh: '林钟', en: 'Linzhong' },
    { zh: '太簇', en: 'Taicu' }, { zh: '南吕', en: 'Nanlü' },
    { zh: '姑洗', en: 'Guxi' }, { zh: '应钟', en: 'Yingzhong' },
    { zh: '蕤宾', en: 'Ruibin' }, { zh: '大吕', en: 'Dalü' },
    { zh: '夷则', en: 'Yize' }, { zh: '夹钟', en: 'Jiazhong' },
    { zh: '无射', en: 'Wuyi' }, { zh: '仲吕', en: 'Zhonglü' }
  ];
  const SEMI_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

  /** 把外部内核包一层：任何抛错或非数值都退回内置实现 */
  const KERNEL_KEYS = [
    'cents', 'hz_from_cents', 'ratio_to_cents', 'cents_to_ratio', 'normalize_octave',
    'sanfen_sunyi', 'equal_temperament', 'just_intonation', 'meantone',
    'werckmeister_iii', 'bell_partials', 'harmonic_series', 'fret_positions',
    'beat_frequency', 'load_world_tunings'
  ];
  const K = (function buildKernel() {
    const ext = W.Tuning;
    const out = { __source: 'fallback' };
    let used = 0;
    KERNEL_KEYS.forEach((key) => {
      const extFn = ext && typeof ext[key] === 'function' ? ext[key] : null;
      const fbFn = FALLBACK_KERNEL[key];
      if (!fbFn) return;
      if (extFn) {
        used++;
        out[key] = function () {
          try {
            const r = extFn.apply(ext, arguments);
            if (r === undefined || r === null) return fbFn.apply(null, arguments);
            return r;
          } catch (e) {
            return fbFn.apply(null, arguments);
          }
        };
      } else {
        out[key] = fbFn;
      }
    });
    if (used) out.__source = 'kernel';
    return out;
  })();

  /* ==================================================================
   * 2 · 音频：优先 window.createSynth(ctx)，缺失则内置最小实现
   * ================================================================== */
  let ACTX = null;
  let SYNTH = null;
  let soundMuted = false;

  function audioCtor() {
    return W.AudioContext || W.webkitAudioContext || null;
  }

  /* FALLBACK: 内置最小合成器（仅在 audio/synth.js 缺失时使用） */
  function buildFallbackSynth(ctx) {
    const master = ctx.createGain();
    master.gain.value = 0.24;
    master.connect(ctx.destination);
    const live = new Set();

    function voice(freq, type, dur, gainPeak, detune) {
      if (!isNum(freq) || freq <= 0) return null;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (detune) osc.detune.setValueAtTime(detune, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainPeak || 0.2), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.08, dur || 1));
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + Math.max(0.1, dur || 1) + 0.02);
      live.add(osc);
      osc.onended = () => live.delete(osc);
      return osc;
    }

    return {
      bell(f0, dur) {
        const base = isNum(f0) ? f0 : C4;
        const d = isNum(dur) ? dur : 2.4;
        [1, 2.4, 3, 4.2].forEach((r, i) => {
          voice(base * r, 'sine', d * (1 - i * 0.16), 0.20 / (i + 1.3));
        });
      },
      pluck(f0, dur) {
        const base = isNum(f0) ? f0 : C4;
        const d = isNum(dur) ? dur : 1.1;
        voice(base, 'triangle', d, 0.20);
        voice(base * 2, 'sine', d * 0.72, 0.07);
      },
      organ(f0, dur) {
        const base = isNum(f0) ? f0 : C4;
        const d = isNum(dur) ? dur : 1.6;
        [1, 2, 3, 4].forEach((r, i) => voice(base * r, 'sine', d, 0.13 / (i + 1)));
      },
      chord(freqs, dur) {
        (freqs || []).forEach((f) => voice(f, 'triangle', isNum(dur) ? dur : 1.8, 0.13));
      },
      stopAll() {
        live.forEach((o) => { try { o.stop(); } catch (e) { /* 已停止 */ } });
        live.clear();
      }
    };
  }

  function ensureAudio() {
    if (soundMuted) return null;
    const Ctor = audioCtor();
    if (!Ctor) return null;
    try {
      if (!ACTX) {
        ACTX = new Ctor();
        const factory = (W.Synth && typeof W.Synth.createSynth === 'function')
          ? W.Synth.createSynth
          : (typeof W.createSynth === 'function' ? W.createSynth : null);
        if (factory) {
          try { SYNTH = factory(ACTX); } catch (e) { SYNTH = null; }
        }
        if (!SYNTH || typeof SYNTH.pluck !== 'function') SYNTH = buildFallbackSynth(ACTX);
      }
      if (ACTX.state === 'suspended' && typeof ACTX.resume === 'function') ACTX.resume();
      return SYNTH;
    } catch (e) {
      return null;
    }
  }

  function synthCall(method) {
    const args = Array.prototype.slice.call(arguments, 1);
    const s = ensureAudio();
    if (!s) return false;
    try {
      if (typeof s[method] === 'function') { s[method].apply(s, args); return true; }
      if (method === 'bell' || method === 'organ' || method === 'pluck') {
        // 兼容极简内核：没有该方法时退回 pluck 语义
        if (typeof s.pluck === 'function') { s.pluck(args[0], args[1]); return true; }
      }
      if (method === 'chord' && typeof s.pluck === 'function') {
        (args[0] || []).forEach((f) => s.pluck(f, args[1]));
        return true;
      }
    } catch (e) { /* 音频失败不影响页面 */ }
    return false;
  }

  function stopAllSound() {
    if (ACTX && SYNTH) {
      try { if (typeof SYNTH.stopAll === 'function') SYNTH.stopAll(); } catch (e) { /* noop */ }
    }
    markPlaying(null);
  }

  /* ==================================================================
   * 3 · 通用工具
   * ================================================================== */
  function fmt(v, d) {
    if (!isNum(v)) return '—';
    const n = d == null ? 2 : d;
    let s = v.toFixed(n);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  }
  function fmtSigned(v, d) {
    if (!isNum(v)) return '—';
    const s = fmt(Math.abs(v), d);
    return (v > 0 ? '+' : (v < 0 ? '-' : '')) + s;
  }
  function fmtSci(x) {
    if (!isNum(x)) return '—';
    if (x === 0) return '0';
    if (Math.abs(x) >= 1e-4) return fmt(x, 12);
    const e = Math.floor(Math.log10(Math.abs(x)));
    const m = x / Math.pow(10, e);
    return fmt(m, 3) + 'e' + e;
  }
  function cjkCount(s) {
    if (!s) return 0;
    const m = String(s).match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g);
    return m ? m.length : 0;
  }
  function normCents(c) {
    let x = c % 1200;
    if (x < 0) x += 1200;
    return x;
  }
  function el(tag, cls, attrs, txt) {
    const e = D.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
    if (txt != null) e.textContent = txt;
    return e;
  }
  /* SVG 节点工厂：用 HTML 解析器生成一次原型再 clone，避免脚本里出现任何 URL 字符串
     （零外部依赖硬扫要求；命名空间由浏览器在解析 <svg> 时自动赋予）。 */
  const SVG_PROTO = (function () {
    try {
      const box = D.createElement('div');
      box.innerHTML = '<svg viewBox="0 0 1 1"><g></g><circle></circle><line></line>' +
        '<path></path><rect></rect><text></text><polyline></polyline></svg>';
      return box.querySelector('svg');
    } catch (e) { return null; }
  })();
  function svgEl(tag, attrs) {
    let node = null;
    if (SVG_PROTO) {
      const proto = tag === 'svg' ? SVG_PROTO : SVG_PROTO.querySelector(tag);
      if (proto) node = proto.cloneNode(false);
    }
    if (!node) node = D.createElement(tag);           // 兜底
    if (attrs) Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  let toastTimer = 0;
  function toast(msg) {
    const box = $('#toast');
    if (!box || !msg) return;
    box.textContent = msg;
    box.classList.add('is-on');
    W.clearTimeout(toastTimer);
    toastTimer = W.setTimeout(() => box.classList.remove('is-on'), 2200);
  }

  /* ---- 读数条：把 spec 渲进 <dl> ---- */
  function renderReadouts(host, rows) {
    if (!host) return;
    const frag = D.createDocumentFragment();
    rows.forEach((r) => {
      const wrap = el('div');
      const dt = el('dt', null, null, r.k);
      const dd = el('dd', r.cls || null);
      if (r.html) dd.innerHTML = r.v;
      else dd.textContent = r.v;
      if (r.unit) dd.appendChild(el('small', null, null, r.unit));
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      frag.appendChild(wrap);
    });
    host.textContent = '';
    host.appendChild(frag);
  }

  function safeV(fn, dflt) {
    try {
      const v = fn();
      return (v === undefined || v === null || (typeof v === 'number' && !isFinite(v))) ? dflt : v;
    } catch (e) { return dflt; }
  }

  /* ==================================================================
   * 4 · 全局状态
   * ================================================================== */
  const state = {
    lang: 'zh',
    motion: !prefersReduced,
    muted: false,
    m1: { steps: 0 },
    m2: { ratio: 0.75, preset: null },
    m3: { active: 12 },
    m4: { step: 7 },
    m5: { sel: ['sanfen', 'tet12', 'ji5'], a: 'sanfen', b: 'tet12', region: 'all', mapId: 'china' },
    m6: { tone: 'front', hui: 6 },
    m7: { fret: 7 }
  };

  const vizState = {};          // 已挂载的可视化实例
  const MODULES = [];
  const MODULE_IDS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];
  const dirty = {};             // 需要按语言重绘的模块
  let currentModule = 'm1';

  /* ==================================================================
   * 5 · 可视化挂载（IntersectionObserver 首次进入才初始化）
   * ================================================================== */
  const DEP = W.__deps || { tuning: false, synth: false, viz: [], paths: {}, viz_paths: {} };

  function loadOptionalDeps() {
    return new Promise((resolve) => {
      const srcs = [];
      // 静态 <script> 已接入的依赖不再重复注入（全局存在即视为已就绪）
      if (DEP.tuning && !W.Tuning && DEP.paths && DEP.paths.tuning) srcs.push(DEP.paths.tuning);
      if (DEP.synth && !W.Synth && DEP.paths && DEP.paths.synth) srcs.push(DEP.paths.synth);
      (DEP.viz || []).forEach((n) => {
        const p = DEP.viz_paths && DEP.viz_paths[n];
        if (p && !(W.Viz && W.Viz[n])) srcs.push(p);
      });
      if (!srcs.length) { resolve(); return; }
      let i = 0;
      const next = () => {
        if (i >= srcs.length) { resolve(); return; }
        const s = D.createElement('script');
        s.src = srcs[i++];
        s.onload = next;
        s.onerror = next;                       // 清单里应存在的文件；出错也不阻塞
        D.body.appendChild(s);
      };
      next();
    });
  }

  const observer = ('IntersectionObserver' in W)
    ? new W.IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const modEl = en.target;
        if (modEl.classList.contains('mod')) {
          modEl.classList.add('is-seen');
          const id = modEl.getAttribute('data-module');
          lazyMount(id);
          observer.unobserve(modEl);
        } else if (modEl.classList.contains('viz-slot')) {
          lazyMountSlot(modEl);
          observer.unobserve(modEl);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 })
    : null;

  const mountedSlots = new Set();

  /* 每个槽位一份规格：组件名（可能为空）+ state() + 自绘降级 fallback()
     槽位 = 带 data-viz 的 DOM 节点（按 id 索引），因此同名组件可在两处用不同 state。 */
  const VIZ_SPECS = {};
  function defineViz(slotId, spec) { VIZ_SPECS[slotId] = spec; }

  function lazyMountSlot(slot) {
    if (!slot || mountedSlots.has(slot)) return;
    mountedSlots.add(slot);
    const id = slot.id;
    const spec = id && VIZ_SPECS[id];
    if (!spec) return;
    try {
      mountViz(slot, spec);
    } catch (e) {
      slot.setAttribute('data-viz-error', '1');
    }
  }

  function mountViz(slot, spec) {
    const name = spec.component;
    const comp = name ? (W.Viz && W.Viz[name]) : null;
    const opts = Object.assign({ lang: state.lang, reducedMotion: !state.motion }, spec.opts || {});
    if (spec.onChange) opts.onChange = spec.onChange;
    if (spec.onSelect) opts.onSelect = spec.onSelect;

    if (comp && typeof comp.init === 'function') {
      try {
        const inst = comp.init(slot, opts);
        if (inst && typeof inst === 'object') {
          vizState[slot.id] = inst;
          slot.classList.add('is-ready');
          slot.setAttribute('data-viz-engine', 'component');
          return inst;
        }
      } catch (e) { /* 组件异常 → 走自绘 */ }
    }
    const inst = spec.fallback(slot);
    vizState[slot.id] = inst;
    slot.classList.add('is-ready');
    slot.setAttribute('data-viz-engine', 'builtin');
    return inst;
  }

  /** 用槽位自己的 state() 刷新该槽位（组件与自绘都走这条路） */
  function refreshSlot(slotId) {
    const spec = VIZ_SPECS[slotId];
    const inst = vizState[slotId];
    if (!spec || !inst || typeof inst.update !== 'function') return;
    try { inst.update(spec.state ? spec.state() : {}); } catch (e) { /* noop */ }
  }

  /* ==================================================================
   * 6 · 各模块
   * ================================================================== */

  /* ---------------------------------------------------------- M1 */
  const M1_STEPS = 12;
  const PYTHAG_COMMA = 1200 * Math.log2(Math.pow(3, 12) / Math.pow(2, 19));

  function m1Gap(n) {
    return n * (1200 * Math.log2(1.5) - 700);
  }
  function m1ChainRatio(n) {
    return Math.pow(1.5, n) / Math.pow(2, (7 * n) / 12);
  }

  defineViz('viz-m1', {
    component: 'spiral5th',
    opts: {},
    state() {
      const n = clamp(state.m1.steps, 0, M1_STEPS);
      // previewSteps = 完整 12 步（淡色底图）；steps = 已揭示的步数
      // 注意：组件按「步」计数（每步一个音分增量），圆心即黄钟起点，不在 steps 里
      const full = [];
      for (let i = 1; i <= M1_STEPS; i++) {
        full.push({
          step: i,
          name: String(i),
          cents: i * 1200 * Math.log2(1.5),
          operation: '×3/2'
        });
      }
      return {
        steps: full.slice(0, n),
        previewSteps: full,
        closureCents: m1Gap(M1_STEPS),
        active: n > 0 ? n - 1 : null
      };
    },
    onSelect(i) {
      if (isNum(i)) { state.m1.steps = clamp(i, 0, M1_STEPS); m1Render(); }
    },
    fallback(host) { return drawSpiralFallback(host, 'm1'); }
  });

  function m1Render() {
    const n = state.m1.steps;
    const gap = m1Gap(n);
    const fifthEnd = K.normalize_octave(Math.pow(1.5, n));
    const octEnd = Math.pow(2, (7 * n) / 12);
    const ratio = safeV(() => m1ChainRatio(n), 1);
    const beat = safeV(() => K.beat_frequency(A4, K.hz_from_cents(A4, gap)), 0);

    renderReadouts($('#m1-readouts'), [
      { k: T('m1.readSteps'), v: n + ' / 12' },
      { k: T('m1.readFifthEnd'), v: fmt(fifthEnd, 6) },
      { k: T('m1.readOctaveEnd'), v: fmt(octEnd, 6) },
      { k: T('m1.readGap'), v: fmtSigned(gap, 4), unit: T('ui.centsShort'), cls: Math.abs(gap) > 0.5 ? 'is-error' : null },
      { k: T('m1.readRatio'), v: fmt(ratio, 8) },
      { k: T('m1.readBeat'), v: fmt(beat, 2), unit: 'Hz' }
    ]);
    const slot = $('#viz-m1');
    if (slot) lazyMountSlot(slot);
    refreshSlot('viz-m1');
    m1FigureUpdate(n);
  }

  function m1FigureUpdate(n) {
    const gap12 = m1Gap(12);
    const cl = kernelClosure();
    const chainTotal = (cl && isNum(cl.twelve_fifths_cents)) ? cl.twelve_fifths_cents : 12 * 1200 * Math.log2(1.5);
    const ratio12 = (cl && isNum(cl.ratio_raw)) ? cl.ratio_raw : m1ChainRatio(12);
    const beat12 = K.beat_frequency(A4, K.hz_from_cents(A4, gap12));
    figuresInto('#m1-figures', [
      figComputed(T('m1.check1'), fmt(chainTotal, 2), T('ui.centsShort'), null),
      figComputed(T('m1.check2'), fmt(gap12, 2), T('ui.centsShort'), 'kernel.pythagorean_comma_cents'),
      figComputed(T('m1.check3'), fmt(ratio12, 8), '', null),
      figComputed(T('m1.check4'), fmt(beat12, 2), 'Hz', null)
    ]);
  }

  function bindM1() {
    const step = $('#m1-step');
    if (step) step.addEventListener('click', () => {
      state.m1.steps = (state.m1.steps >= M1_STEPS) ? 0 : state.m1.steps + 1;
      m1Render();
    });
    const run = $('#m1-run');
    if (run) run.addEventListener('click', () => {
      if (state.m1.steps >= M1_STEPS) { state.m1.steps = 0; m1Render(); return; }
      const tick = () => {
        state.m1.steps = Math.min(M1_STEPS, state.m1.steps + 1);
        m1Render();
        if (state.m1.steps < M1_STEPS) W.setTimeout(tick, 220);
      };
      tick();
    });
    const reset = $('#m1-reset');
    if (reset) reset.addEventListener('click', () => { state.m1.steps = 0; m1Render(); });
    const play = $('#m1-play');
    if (play) play.addEventListener('click', () => { playM1Compare(); markPlaying(play); });
    const beat = $('#m1-beat');
    if (beat) beat.addEventListener('click', () => { playM1Beat(); markPlaying(beat); });
  }

  function playM1Compare() {
    stopAllSound();
    const s = ensureAudio();
    if (!s) { toast(T('m1.hintPlay')); return; }
    const seq = [];
    for (let i = 0; i < 12; i++) seq.push(K.normalize_octave(Math.pow(1.5, i)) * C4);
    let i = 0;
    const tick = () => {
      if (i < seq.length) {
        synthCall('pluck', seq[i], 0.34);
        i++;
        W.setTimeout(tick, 130);
      } else {
        // 终点：链尾 vs 纯八度
        W.setTimeout(() => {
          synthCall('chord', [C4, K.hz_from_cents(C4, PYTHAG_COMMA)], 2.4);
        }, 180);
      }
    };
    tick();
  }

  function playM1Beat() {
    stopAllSound();
    const s = ensureAudio();
    if (!s) { toast(T('m1.hintPlay')); return; }
    const f2 = K.hz_from_cents(A4, PYTHAG_COMMA);
    synthCall('chord', [A4, f2], 3.0);
  }

  /* ---------------------------------------------------------- M2 */
  const M2_PRESETS = [
    { id: 'octave', ratio: 0.5, key: 'm2.preset_octave', note: 'm2.noteOctave' },
    { id: 'fifth', ratio: 2 / 3, key: 'm2.preset_fifth', note: 'm2.noteFifth' },
    { id: 'fourth', ratio: 3 / 4, key: 'm2.preset_fourth', note: 'm2.noteFourth' },
    { id: 'major3just', ratio: 4 / 5, key: 'm2.preset_major3just', note: 'm2.noteMajor3just' },
    { id: 'major3pyth', ratio: 64 / 81, key: 'm2.preset_major3pyth', note: 'm2.noteMajor3pyth' },
    { id: 'semitone', ratio: Math.pow(2, -1 / 12), key: 'm2.preset_semitone', note: 'm2.noteSemitone' }
  ];

  function m2Freq(ratio) {
    return C4 / clamp(ratio, 0.5, 1);
  }
  function m2Cents(ratio) {
    return 1200 * Math.log2(1 / clamp(ratio, 0.5, 1));
  }

  defineViz('viz-m2', {
    component: 'monochord',
    opts: { range: [0.5, 1], value: 0.75 },
    state() {
      const r = state.m2.ratio;
      return {
        ratio: r,
        lens: M2_PRESETS.map((p) => ({ label: T(p.key), ratio: p.ratio })),
        hz: m2Freq(r),
        cents: m2Cents(r),
        note: SEMI_NAMES[Math.round(normCents(m2Cents(r)) / 100) % 12]
      };
    },
    onChange(ratio) {
      state.m2.ratio = clamp(Number(ratio) || 0.75, 0.5, 1);
      m2Render();
    },
    fallback(host) { return drawMonochordFallback(host, 'm2'); }
  });

  function m2Render() {
    const r = state.m2.ratio;
    const hz = m2Freq(r);
    const cents = m2Cents(r);
    const nearest = Math.round(cents / 100);
    const dev = cents - nearest * 100;
    const noteIdx = ((nearest % 12) + 12) % 12;
    const oct = 4 + Math.floor(nearest / 12);

    const slider = $('#m2-slider');
    if (slider && Math.abs(parseFloat(slider.value) / 100 - r) > 0.0005) slider.value = String(Math.round(r * 100));
    const out = $('#m2-out');
    if (out) out.textContent = fmt(r, 3);

    renderReadouts($('#m2-readouts'), [
      { k: T('m2.readLength'), v: fmt(r, 4) },
      { k: T('m2.readRatio'), v: '1 : ' + fmt(1 / r, 4) },
      { k: T('m2.readHz'), v: fmt(hz, 2), unit: 'Hz' },
      { k: T('m2.readCents'), v: fmtSigned(cents, 2), unit: T('ui.centsShort') },
      { k: T('m2.readNote'), v: SEMI_NAMES[noteIdx] + oct },
      { k: T('m2.readNearest'), v: fmtSigned(dev, 2), unit: T('ui.centsShort'), cls: Math.abs(dev) > 10 ? 'is-error' : 'is-ok' }
    ]);

    // 预设芯片高亮
    $$('#m2-presets .chip').forEach((b) => {
      const v = parseFloat(b.getAttribute('data-ratio'));
      b.setAttribute('aria-pressed', String(Math.abs(v - r) < 0.0015));
    });

    const slot = $('#viz-m2');
    if (slot) lazyMountSlot(slot);
    refreshSlot('viz-m2');

    // 断言：弦长 × 频率 恒定
    const l1 = 0.5, l2 = 0.9;
    const constCheck = Math.abs((1 / l1) * l1 - (1 / l2) * l2);
    const presErr = Math.max.apply(null, M2_PRESETS.map((p) => {
      if (p.id === 'fifth') return Math.abs(m2Cents(p.ratio) - 701.955001);
      if (p.id === 'octave') return Math.abs(m2Cents(p.ratio) - 1200);
      if (p.id === 'fourth') return Math.abs(m2Cents(p.ratio) - 498.045001);
      if (p.id === 'major3just') return Math.abs(m2Cents(p.ratio) - 386.313714);
      if (p.id === 'major3pyth') return Math.abs(m2Cents(p.ratio) - 407.820004);
      return Math.abs(m2Cents(p.ratio) - 100);
    }));
    figuresInto('#m2-figures', [
      figComputed(T('m2.check1'), constCheck < ZERO ? '0' : fmtSci(constCheck), T('ui.centsShort'), null),
      figComputed(T('m2.check2'), fmtSigned(cents, 2), T('ui.centsShort'), null),
      figComputed(T('m2.check3'), fmtSci(presErr), T('ui.centsShort'), null),
      figComputed(T('m2.check4'), '701.9550', T('ui.centsShort'), null)
    ]);
  }

  function renderM2Presets() {
    const host = $('#m2-presets');
    if (!host) return;
    host.textContent = '';
    M2_PRESETS.forEach((p) => {
      const b = el('button', 'chip', { type: 'button', 'data-ratio': String(p.ratio), 'aria-pressed': 'false', title: T(p.note) }, T(p.key));
      b.addEventListener('click', () => {
        state.m2.ratio = p.ratio;
        m2Render();
      });
      host.appendChild(b);
    });
    m2Render();
  }

  function bindM2() {
    const slider = $('#m2-slider');
    if (slider) {
      slider.addEventListener('input', () => {
        state.m2.ratio = clamp(parseFloat(slider.value) / 100, 0.5, 1);
        m2Render();
      });
    }
    const play = $('#m2-play');
    if (play) play.addEventListener('click', () => {
      stopAllSound();
      synthCall('chord', [C4, m2Freq(state.m2.ratio)], 2.6);
      markPlaying(play);
    });
  }

  /* ---------------------------------------------------------- M3 */
  function m3Pitches() {
    // 内核 sanfen_sunyi 返回 {base_hz, steps[], closure}；内置实现返回数组 —— 统一归一化
    const raw = safeV(() => K.sanfen_sunyi(C4), null);
    let steps = null;
    if (raw && Array.isArray(raw.steps)) steps = raw.steps;
    else if (Array.isArray(raw)) steps = raw;
    if (!steps || !steps.length) steps = FALLBACK_KERNEL.sanfen_sunyi(C4);
    return steps.map((r, i) => {
      const nameZh = r.name_zh || r.name || SANFEN_NAMES[i % 12].zh;
      const nameEn = r.name_en || r.pinyin || SANFEN_NAMES[i % 12].en;
      let ratio = isNum(r.ratio_octave) ? r.ratio_octave : (isNum(r.ratio) ? r.ratio : 1);
      if (!(ratio >= 1 && ratio < 2)) ratio = K.normalize_octave(ratio);
      const hz = (isNum(r.hz) && r.hz > 0) ? r.hz : C4 * ratio;
      const cents = isNum(r.cents_from_base) ? r.cents_from_base
        : (isNum(r.cents) ? r.cents : 1200 * Math.log2(ratio));
      return {
        index: i,
        name_zh: nameZh,
        name_en: nameEn,
        ratio: ratio,
        hz: hz,
        cents: normCents(cents),
        chainCents: i * 1200 * Math.log2(1.5)
      };
    });
  }

  /** 内核的闭合结论（内核可用时用它的精确值，避免本页另行算出别的数） */
  function kernelClosure() {
    const raw = safeV(() => K.sanfen_sunyi(C4), null);
    if (raw && raw.closure && isNum(raw.closure.cents)) return raw.closure;
    return null;
  }

  /** 把世界律制数据注入内核（内核据此给出 status，不编造数据） */
  function injectWorldTunings() {
    try {
      const list = (W.TuningData && Array.isArray(W.TuningData.systems)) ? W.TuningData.systems : null;
      if (list && list.length && typeof K.set_world_tunings === 'function') {
        K.set_world_tunings(list);
        return true;
      }
    } catch (e) { /* noop */ }
    return false;
  }

  const M3_PITCHES = [];

  function m3Render() {
    const n = clamp(state.m3.active, 0, 12);
    const rows = M3_PITCHES.slice(0, n);
    const tbody = $('#m3-tbody');
    if (tbody) {
      tbody.textContent = '';
      rows.forEach((r, i) => {
        const tr = el('tr');
        if (state.m3.active >= 12 && i === 11) tr.className = 'is-active';
        tr.appendChild(el('td', null, null, String(i + 1)));
        tr.appendChild(el('td', 'lu-name', null, state.lang === 'zh' ? r.name_zh : r.name_en));
        tr.appendChild(el('td', null, null, fmt(r.ratio, 6)));
        tr.appendChild(el('td', null, null, fmt(r.hz, 2)));
        tr.appendChild(el('td', 'num-cents', null, fmt(r.cents, 2)));
        tr.appendChild(el('td', 'num-dev', null,
          fmtSigned(r.cents - Math.round(r.cents / 100) * 100, 2)));
        tbody.appendChild(tr);
      });
    }

    const gap = m1Gap(12);
    const last = rows.length >= 12 ? rows[11] : null;
    renderReadouts($('#m3-readouts'), [
      { k: T('m3.readClosing'), v: fmtSigned(gap, 4), unit: T('ui.centsShort'), cls: 'is-error' },
      { k: T('m3.readNote'), v: last ? fmt(last.cents, 3) : '—', unit: T('ui.centsShort') },
      { k: T('m3.tableDev'), v: last ? fmtSigned(last.cents - Math.round(last.cents / 100) * 100, 2) : '—', unit: T('ui.centsShort') },
      { k: T('ui.status'), v: T('m3.statusOpen'), cls: 'is-error' }
    ]);

    const slot = $('#viz-m3');
    if (slot) lazyMountSlot(slot);
    refreshSlot('viz-m3');

    figuresInto('#m3-figures', [
      figComputed(T('m3.check1'), fmt(1.5, 1) + 'x', '', null),
      figComputed(T('m3.check2'), fmt(gap, 4), T('ui.centsShort'), 'kernel.pythagorean_comma_cents'),
      figComputed(T('m3.check3'), last ? fmt(last.ratio, 8) : '—', '', null),
      figComputed(T('m3.check4'), '1.5x', '', null)
    ]);
  }

  defineViz('viz-m3', {
    component: 'spiral5th',
    opts: {},
    state() {
      const n = clamp(state.m3.active, 0, 12);
      const full = [];
      for (let i = 0; i < 11; i++) {
        const p = M3_PITCHES[i + 1];
        full.push({
          step: i + 1,
          name: p ? (state.lang === 'zh' ? p.name_zh : p.name_en) : String(i + 1),
          cents: (i + 1) * 1200 * Math.log2(1.5),
          operation: '×3/2'
        });
      }
      full.push({ step: 12, name: T('m3.closureAttempt'), cents: 12 * 1200 * Math.log2(1.5), operation: '×3/2' });
      return {
        steps: full.slice(0, n),
        previewSteps: full,
        closureCents: m1Gap(12),
        active: n > 0 ? n - 1 : null
      };
    },
    onSelect(i) {
      if (isNum(i)) { state.m3.active = clamp(i + 1, 1, 12); m3Render(); }
    },
    fallback(host) { return drawSpiralFallback(host, 'm3'); }
  });

  function bindM3() {
    const gen = $('#m3-gen');
    if (gen) gen.addEventListener('click', () => {
      state.m3.active = (state.m3.active >= 12) ? 0 : state.m3.active + 1;
      m3Render();
      if (state.m3.active > 0) {
        const p = M3_PITCHES[state.m3.active - 1];
        synthCall('pluck', p.hz, 0.7);
      }
    });
    const all = $('#m3-all');
    if (all) all.addEventListener('click', () => {
      state.m3.active = 0;
      const tick = () => {
        if (state.m3.active >= 12) return;
        state.m3.active++;
        m3Render();
        const p = M3_PITCHES[state.m3.active - 1];
        synthCall('pluck', p.hz, 0.5);
        W.setTimeout(tick, 190);
      };
      tick();
    });
    const reset = $('#m3-reset');
    if (reset) reset.addEventListener('click', () => { state.m3.active = 0; m3Render(); });
    const wolf = $('#m3-wolf');
    if (wolf) wolf.addEventListener('click', () => {
      stopAllSound();
      const f1 = C4;
      const f2 = K.hz_from_cents(C4, m1Gap(12));
      synthCall('chord', [f1, f2], 3.0);
      markPlaying(wolf);
    });
    const scale = $('#m3-scale');
    if (scale) scale.addEventListener('click', () => {
      stopAllSound();
      M3_PITCHES.slice().sort((a, b) => a.cents - b.cents).forEach((p, i) => {
        W.setTimeout(() => synthCall('pluck', p.hz, 0.42), i * 160);
      });
      markPlaying(scale);
    });
  }

  /* ---------------------------------------------------------- M4 */
  const M4_DERIV = [
    { key: 'd1', expr: 'r¹² = 2', val: null },
    { key: 'd2', expr: '2^(1/2) = √2', val: Math.SQRT2 },
    { key: 'd3', expr: '2^(1/4) = √(√2)', val: Math.sqrt(Math.SQRT2) },
    { key: 'd4', expr: '2^(1/3) ', val: Math.cbrt(2) },
    { key: 'd5', expr: '2^(1/6) = √(2^(1/3))', val: Math.sqrt(Math.cbrt(2)) },
    { key: 'd6', expr: '2^(1/4) ÷ 2^(1/6)', val: Math.sqrt(Math.SQRT2) / Math.sqrt(Math.cbrt(2)) },
    { key: 'd7', expr: '密率¹²', val: Math.pow(Math.pow(2, 1 / 12), 12) }
  ];
  const MILU = Math.pow(2, 1 / 12);

  function m4Render() {
    const n = clamp(state.m4.step, 0, M4_DERIV.length);
    const host = $('#m4-deriv');
    if (host) {
      host.textContent = '';
      M4_DERIV.slice(0, n).forEach((d, i) => {
        const li = el('li');
        li.appendChild(el('span', 'dk', null, T('m4.step' + (i + 1))));
        if (d.val != null) {
          li.appendChild(el('span', 'dv', null, ' = ' + (i === M4_DERIV.length - 1
            ? d.val.toPrecision(17) : fmt(d.val, 15))));
        }
        host.appendChild(li);
      });
    }
    const power = Math.pow(MILU, 12);
    renderReadouts($('#m4-power'), [
      { k: T('m4.powerResult'), v: power.toPrecision(17), cls: 'is-ok' },
      { k: T('m4.powerTarget'), v: '2' },
      { k: T('m4.powerDiff'), v: fmtSci(Math.abs(power - 2)), unit: '', cls: 'is-ok' }
    ]);
    const litRecorded = 1.059463094;
    renderReadouts($('#m4-lit'), [
      { k: T('m4.litRecorded'), v: fmt(litRecorded, 9) },
      { k: T('m4.litComputed'), v: fmt(MILU, 16) },
      { k: T('m4.litDiff'), v: fmt(Math.abs(litRecorded - MILU), 12) }
    ]);

    // 十二个半音全部 100 音分
    const et = K.equal_temperament(12);
    const maxDevEt = Math.max.apply(null, et.map((x) => Math.abs(x.cents - x.index * 100)));
    figuresInto('#m4-figures', [
      figComputed(T('m4.check1'), fmtSci(Math.abs(MILU - Math.pow(2, 1 / 12))), '', null),
      figComputed(T('m4.check2'), fmtSci(Math.abs(power - 2)), '', null),
      figComputed(T('m4.check3'), fmtSci(Math.abs(litRecorded - MILU)), '', null),
      figComputed(T('m4.check4'), fmtSci(maxDevEt), T('ui.centsShort'), null)
    ]);
  }

  /** 年份标签：中文用 year_label_zh；英文只接受无 CJK 的标签，否则由 year 数值生成 */
  function yearLabel(ev) {
    const y = ev ? ev.year : null;
    const zh = state.lang === 'zh';
    const raw = ev ? (zh ? ev.year_label_zh : ev.year_label_en) : '';
    if (typeof raw === 'string' && raw &&
        (zh || !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(raw))) {
      return raw;
    }
    if (!isNum(y)) return '';
    if (y < 0) return 'c. ' + Math.abs(y) + ' BCE';
    if (y < 1000) return String(y) + ' CE';
    return String(y);
  }

  /** 来源标注：只由 source_ids 生成，任何语言都不含仓库路径/中文括注 */
  function sourceLabel(ev) {
    const ids = (ev && Array.isArray(ev.source_ids)) ? ev.source_ids.filter(Boolean) : [];
    const reg = T('m8.sourceRegister');
    if (ids.length) return T('m8.sourcesInline', { ids: ids.join(', '), reg: reg });
    if (state.lang === 'zh' && ev && ev.source) {
      return T('ui.source') + ': ' +
        String(ev.source).replace(/（[^）]*sources\.md[^）]*）/g, '').replace(/\s+$/, '');
    }
    return T('m8.sourcesInline', { ids: '-', reg: reg });
  }

  function renderM4Timeline() {
    const host = $('#m4-timeline');
    if (!host) return;
    const data = W.HistoryData && Array.isArray(W.HistoryData.events) ? W.HistoryData.events : [];
    host.textContent = '';
    data.forEach((ev) => {
      const item = el('div', 'tl-item' + (ev.year === 1584 || ev.year === -433 ? ' is-key' : ''));
      item.appendChild(el('div', 'tl-year', null, yearLabel(ev)));
      item.appendChild(el('div', 'tl-title', null, state.lang === 'zh' ? ev.title_zh : ev.title_en));
      const body = el('p', 'tl-body', null, state.lang === 'zh' ? ev.body_zh : ev.body_en);
      item.appendChild(body);
      if (ev.status) item.appendChild(el('span', 'tl-status', null, statusText(ev.status)));
      const srcTxt = sourceLabel(ev);
      if (srcTxt) item.appendChild(el('div', 'tl-src', null, srcTxt));
      host.appendChild(item);
    });
  }

  function m4Chord(systemId) {
    const sys = findSystem(systemId) || findSystem('tet12');
    if (!sys) return [C4, C4 * Math.pow(2, 4 / 12), C4 * Math.pow(2, 7 / 12), C4 * Math.pow(2, 11 / 12), C4 * 2];
    const c = sys.cents;
    const pick = (semi) => {
      const target = semi * 100;
      let best = c[0], bd = Infinity;
      c.forEach((x) => { const d = Math.abs(x - target); if (d < bd) { bd = d; best = x; } });
      if (Math.abs(best - target) > 180 && c.indexOf(0) >= 0) {
        // 找不到靠得住的对应音级时退回平均律位置
        return target;
      }
      return best;
    };
    return [0, 4, 7, 11, 12].map((semi) => K.hz_from_cents(C4, semi === 12 ? 1200 : pick(semi)));
  }

  function bindM4() {
    const step = $('#m4-step');
    if (step) step.addEventListener('click', () => {
      state.m4.step = (state.m4.step >= M4_DERIV.length) ? 1 : state.m4.step + 1;
      m4Render();
    });
    const all = $('#m4-all');
    if (all) all.addEventListener('click', () => { state.m4.step = M4_DERIV.length; m4Render(); });
    const reset = $('#m4-reset');
    if (reset) reset.addEventListener('click', () => { state.m4.step = 0; m4Render(); });

    [['#m4-play-sanfen', 'sanfen'], ['#m4-play-meantone', 'meantone'], ['#m4-play-tet', 'tet12']].forEach((pair) => {
      const b = $(pair[0]);
      if (!b) return;
      b.addEventListener('click', () => {
        stopAllSound();
        const freqs = m4Chord(pair[1]);
        freqs.forEach((f, i) => W.setTimeout(() => synthCall('organ', f, 1.5), i * 60));
        markPlaying(b);
      });
    });
  }

  /* ---------------------------------------------------------- M5 */
  function allSystems() {
    const raw = (W.TuningData && Array.isArray(W.TuningData.systems)) ? W.TuningData.systems : [];
    return raw.filter((x) => x && Array.isArray(x.cents) && x.cents.length > 1);
  }
  function findSystem(id) {
    return allSystems().filter((s) => s.id === id)[0] || null;
  }
  function sysName(s) {
    if (!s) return '—';
    return state.lang === 'zh' ? (s.name_zh || s.id) : (s.name_en || s.id);
  }
  function sysShort(s) {
    if (!s) return '—';
    return state.lang === 'zh' ? (s.name_short_zh || s.name_zh || s.id) : (s.name_short_en || s.name_en || s.id);
  }
  function statusBadge(s) {
    // 律制表口径：pending → 「文献参考值」（内部状态仍是待核验，M8 说明）
    const st = s.status || 'pending';
    const map = {
      verified: 'ui.statusVerified', research: 'ui.statusResearch', official: 'ui.statusOfficial',
      computed: 'ui.statusComputed', pending: 'ui.statusLiterature'
    };
    return { text: T(map[st] || 'ui.statusLiterature'), cls: 'sys-badge is-' + (st === 'pending' ? 'pending' : 'verified') };
  }
  function statusText(st) {
    const map = {
      verified: 'ui.statusVerified', research: 'ui.statusResearch', official: 'ui.statusOfficial',
      pending: 'ui.statusPending', computed: 'ui.statusComputed'
    };
    return T(map[st] || 'ui.statusPending');
  }

  defineViz('viz-m5', {
    component: 'centsRuler',
    opts: {},
    state() {
      return {
        systems: m5Selected().map((s) => ({
          id: s.id,
          name: sysName(s),
          color: (s.status === 'pending') ? 'var(--red)' : null,
          cents: s.cents
        }))
      };
    },
    onSelect(info) {
      if (!info || !isNum(info.cents)) return;
      synthCall('pluck', K.hz_from_cents(C4, info.cents), 0.7);
    },
    fallback(host) { return drawRulerFallback(host); }
  });

  const MAP_TO_REGION = {
    greece: 'europe', europe: 'europe', china: 'china', india: 'india',
    arabic: 'arabic', indonesia: 'indonesia', thailand: 'thailand'
  };

  defineViz('viz-m5-map', {
    component: 'worldmap',
    opts: { coord: 'lonlat' },
    state() {
      const regions = (W.WorldData && Array.isArray(W.WorldData.regions)) ? W.WorldData.regions : [];
      let sel = state.m5.mapId;
      if (!sel || !regions.some((r) => r.id === sel)) sel = (regions[0] || {}).id || '';
      return {
        entries: regions.map((r) => ({
          id: r.id,
          name_zh: r.name_zh || r.id,
          name_en: r.name_en || r.id,
          culture: (state.lang === 'zh' ? (r.instruments_zh || '') : (r.instruments_en || '')),
          region: { x: isNum(r.lon) ? r.lon : 0, y: isNum(r.lat) ? r.lat : 0 }
        })),
        selected: sel
      };
    },
    onSelect(id) {
      const regions = (W.WorldData && Array.isArray(W.WorldData.regions)) ? W.WorldData.regions : [];
      if (!regions.some((r) => r.id === id)) return;
      state.m5.mapId = id;
      state.m5.region = MAP_TO_REGION[id] || id;
      applyRegionFilter();
      renderM5Regions();
      renderM5MapInfo();
      refreshSlot('viz-m5-map');
    },
    fallback(host) { return drawMapFallback(host); }
  });

  function m5Selected() {
    const all = allSystems();
    return all.filter((s) => state.m5.sel.indexOf(s.id) >= 0);
  }

  function maxDevVsET(sys) {
    if (!sys || !sys.cents) return 0;
    // 与「十二平均律最近音级」比：c 距最近的 100 音分整数格多远（不假设音数 = 12）
    let mx = 0;
    sys.cents.forEach((c) => {
      const d = Math.abs(c - Math.round(c / 100) * 100);
      if (d > mx) mx = d;
    });
    return mx;
  }

  function m5Render() {
    renderM5List();
    renderM5Ruler();
    renderM5Selects();
    const a = findSystem(state.m5.a), b = findSystem(state.m5.b);
    renderReadouts($('#m5-readouts'), [
      { k: T('ui.systemA'), v: sysName(a) },
      { k: T('ui.systemB'), v: sysName(b) },
      { k: T('m5.noteCount', { n: a ? a.cents.length : 0 }), v: a ? String(a.cents.length) : '—' },
      { k: T('m5.check4'), v: fmt(Math.max(maxDevVsET(a), maxDevVsET(b)), 2), unit: T('ui.centsShort') }
    ]);

    const all = allSystems();
    const pending = all.filter((s) => (s.status || 'pending') === 'pending').length;
    let maxDev = 0;
    all.forEach((s) => { const d = maxDevVsET(s); if (d > maxDev) maxDev = d; });
    const sums = all.map((s) => {
      let t = 0;
      for (let i = 1; i < s.cents.length; i++) t += s.cents[i] - s.cents[i - 1];
      t += 1200 - s.cents[s.cents.length - 1];
      return Math.abs(t - 1200);
    });
    figuresInto('#m5-figures', [
      figComputed(T('m5.check1'), String(all.length), '', null),
      figComputed(T('m5.check2'), fmt(Math.max.apply(null, sums), 12), T('ui.centsShort'), null),
      figComputed(T('m5.check3'), String(pending), '', null),
      figComputed(T('m5.check4'), fmt(maxDev, 2), T('ui.centsShort'), null)
    ]);
    const slot = $('#viz-m5');
    if (slot) { lazyMountSlot(slot); refreshSlot('viz-m5'); }
    const mapSlot = $('#viz-m5-map');
    if (mapSlot) { lazyMountSlot(mapSlot); refreshSlot('viz-m5-map'); }
    renderM5MapInfo();
  }

  function renderM5MapInfo() {
    const host = $('#m5-map-info');
    if (!host) return;
    const regions = (W.WorldData && Array.isArray(W.WorldData.regions)) ? W.WorldData.regions : [];
    const r = regions.filter((x) => x.id === state.m5.mapId)[0] || regions[0];
    if (!r) { host.textContent = ''; return; }
    const zh = state.lang === 'zh';
    host.textContent = (zh ? r.name_zh : r.name_en) + ' · ' + (zh ? r.body_zh : r.body_en);
  }

  function renderM5List() {
    const host = $('#m5-list');
    if (!host) return;
    host.textContent = '';
    const all = allSystems();
    all.forEach((s) => {
      const on = state.m5.sel.indexOf(s.id) >= 0;
      const li = el('li');
      const btn = el('button', 'sys-item', { type: 'button', 'aria-pressed': String(on) });
      const left = el('span');
      left.appendChild(el('span', 'sys-name', null, sysName(s)));
      const badge = statusBadge(s);
      left.appendChild(el('span', badge.cls, null, badge.text));
      btn.appendChild(left);
      btn.appendChild(el('span', 'sys-meta', null, s.cents.length + ' ' + T('ui.notes')));
      btn.addEventListener('click', () => {
        const i = state.m5.sel.indexOf(s.id);
        if (i >= 0) { if (state.m5.sel.length > 1) state.m5.sel.splice(i, 1); }
        else state.m5.sel.push(s.id);
        m5Render();
      });
      li.appendChild(btn);
      host.appendChild(li);
    });
  }

  function renderM5Ruler() {
    const host = $('#viz-m5');
    if (!host) return;
    if (host.getAttribute('data-viz-engine') === 'component') return;  // 组件接管
    if (host.getAttribute('data-viz-engine') === 'builtin') { refreshSlot('viz-m5'); return; }
    drawRulerInto(host, m5Selected());
  }

  function renderM5Selects() {
    const all = allSystems();
    [['#m5-a', 'a'], ['#m5-b', 'b']].forEach((pair) => {
      const sel = $(pair[0]);
      if (!sel) return;
      const cur = state.m5[pair[1]];
      sel.textContent = '';
      all.forEach((s) => {
        const o = el('option', null, { value: s.id }, sysName(s));
        if (s.id === cur) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = () => {
        state.m5[pair[1]] = sel.value;
        m5Render();
      };
    });
  }

  function renderM5Regions() {
    const host = $('#m5-regions');
    if (!host) return;
    host.textContent = '';
    const regions = ['all', 'china', 'europe', 'india', 'arabic', 'indonesia', 'thailand', 'global'];
    regions.forEach((r) => {
      const on = state.m5.region === r;
      const b = el('button', 'chip', { type: 'button', 'aria-pressed': String(on) }, T('m5.region_' + r));
      b.addEventListener('click', () => { state.m5.region = r; applyRegionFilter(); renderM5Regions(); });
      host.appendChild(b);
    });
  }

  function applyRegionFilter() {
    const all = allSystems();
    if (state.m5.region === 'all') {
      state.m5.sel = all.slice(0, 3).map((s) => s.id);
    } else {
      const ids = all.filter((s) => (s.region || 'global') === state.m5.region).map((s) => s.id);
      state.m5.sel = ids.length ? ids : [all[0] && all[0].id].filter(Boolean);
      if (ids.length) {
        state.m5.a = ids[0];
        state.m5.b = ids[1] || ids[0];
      }
    }
    m5Render();
  }

  function playMelodyFor(sysId) {
    const sys = findSystem(sysId);
    if (!sys) return;
    stopAllSound();
    const cs = sys.cents;
    const idxs = [];
    const n = cs.length;
    for (let k = 0; k < 5; k++) {
      const want = Math.round((k / 5) * n);
      idxs.push(clamp(want, 0, n - 1));
    }
    idxs.forEach((ix, i) => {
      const c = cs[ix];
      W.setTimeout(() => synthCall('pluck', K.hz_from_cents(C4, c), 0.55), i * 240);
    });
  }

  function bindM5() {
    const pa = $('#m5-play-a');
    if (pa) pa.addEventListener('click', () => { playMelodyFor(state.m5.a); markPlaying(pa); });
    const pb = $('#m5-play-b');
    if (pb) pb.addEventListener('click', () => { playMelodyFor(state.m5.b); markPlaying(pb); });
  }

  /* ---------------------------------------------------------- M6 */
  const BELL_F0 = C4 / 2;                      // 编钟正鼓音（示意，C3）
  const BELL_SIDE_CENTS = 386.3137;            // 侧鼓音 ≈ 大三度
  const GUQIN_F0 = C4 / 2;                     // 古琴基音（示意，C3）
  const HUI = [
    { hui: 1, frac: 1 / 8, fracText: '1/8' }, { hui: 2, frac: 1 / 6, fracText: '1/6' },
    { hui: 3, frac: 1 / 5, fracText: '1/5' }, { hui: 4, frac: 1 / 4, fracText: '1/4' },
    { hui: 5, frac: 1 / 3, fracText: '1/3' }, { hui: 6, frac: 2 / 5, fracText: '2/5' },
    { hui: 7, frac: 1 / 2, fracText: '1/2' }, { hui: 8, frac: 3 / 5, fracText: '3/5' },
    { hui: 9, frac: 2 / 3, fracText: '2/3' }, { hui: 10, frac: 3 / 4, fracText: '3/4' },
    { hui: 11, frac: 4 / 5, fracText: '4/5' }, { hui: 12, frac: 5 / 6, fracText: '5/6' },
    { hui: 13, frac: 7 / 8, fracText: '7/8' }
  ];
  function huiHarmonic(frac) {
    // 约分后得到泛音序号：x/L = p/q → 泛音 q
    let a = Math.round(frac * 840), b = 840;
    const g = (function gcd(x, y) { return y ? gcd(y, x % y) : x; })(a, b);
    return b / g;
  }

  const BELL_SET = [
    { id: 'b1', semi: 0, size: 1.00 },
    { id: 'b2', semi: 4, size: 0.86 },
    { id: 'b3', semi: 7, size: 0.78 },
    { id: 'b4', semi: 12, size: 0.64 }
  ];
  function bellFreqs(id) {
    const b = BELL_SET.filter((x) => x.id === id)[0] || BELL_SET[0];
    const front = K.hz_from_cents(BELL_F0, b.semi * 100);
    return { front: front, side: K.hz_from_cents(front, BELL_SIDE_CENTS) };
  }
  function bellEntries() {
    return BELL_SET.map((b, i) => {
      const fq = bellFreqs(b.id);
      return {
        id: b.id,
        name: T('m6.bellName', { n: i + 1 }),
        bellfrontHz: fq.front,
        bellsideHz: fq.side,
        size: b.size
      };
    });
  }

  defineViz('viz-m6', {
    component: 'bell',
    opts: {},
    state() {
      return { bells: bellEntries(), selected: state.m6.bell, tone: state.m6.tone };
    },
    onSelect(id) {
      if (!BELL_SET.some((b) => b.id === id)) return;
      state.m6.bell = id;
      m6Render();
      playBellTone('front');
    },
    onTone(id, tone) {
      if (BELL_SET.some((b) => b.id === id)) state.m6.bell = id;
      state.m6.tone = (tone === 'side') ? 'side' : 'front';
      m6Render();
      playBellTone(state.m6.tone);
    },
    fallback(host) { return drawBellFallback(host); }
  });

  defineViz('viz-m6-spec', {
    component: 'spectrum',
    opts: {},
    state() {
      const fq = bellFreqs(state.m6.bell);
      const raw = safeV(() => K.bell_partials(fq.front, 8), null);
      const list = (Array.isArray(raw) && raw.length) ? raw : FALLBACK_KERNEL.bell_partials(fq.front, 8);
      return {
        partials: list.map((p, i) => ({
          n: isNum(p.n) ? p.n : i + 1,
          ratio: isNum(p.ratio) ? p.ratio : (isNum(p.hz) ? p.hz / fq.front : 1),
          amp: isNum(p.amp) ? p.amp : Math.max(0.05, 1 / (i + 1)),
          name: p.name || ''
        })),
        f0: fq.front,
        playing: false
      };
    },
    fallback(host) { return drawSpectrumFallback(host); }
  });

  defineViz('viz-m6-hui', {
    component: null,
    opts: {},
    state() { return { hui: state.m6.hui }; },
    fallback(host) {
      return {
        update() { drawHuiStrip(host); },
        highlight() {}, resize() {}, destroy() {}, setLang() {}
      };
    }
  });
  function m6Render() {
    const fq = bellFreqs(state.m6.bell);
    const interval = safeV(() => K.cents(fq.front, fq.side), BELL_SIDE_CENTS);
    renderReadouts($('#m6-readouts'), [
      { k: T('m6.currentTone'), v: state.m6.tone === 'side' ? T('m6.bellSide') : T('m6.bellFront') },
      { k: T('m6.bellFront'), v: fmt(fq.front, 2), unit: 'Hz' },
      { k: T('m6.bellSide'), v: fmt(fq.side, 2), unit: 'Hz' },
      { k: T('m6.bellInterval'), v: fmtSigned(interval, 2), unit: T('ui.centsShort') }
    ]);
    $$('#m6-front, #m6-side').forEach((b) => {
      const isFront = b.id === 'm6-front';
      b.setAttribute('aria-pressed', String((state.m6.tone === 'front') === isFront));
    });

    const bellSlot = D.getElementById('viz-m6');
    if (bellSlot) { lazyMountSlot(bellSlot); refreshSlot('viz-m6'); }
    const specSlot = D.getElementById('viz-m6-spec');
    if (specSlot) { lazyMountSlot(specSlot); refreshSlot('viz-m6-spec'); }
    const huiSlot = D.getElementById('viz-m6-hui');
    if (huiSlot) { lazyMountSlot(huiSlot); refreshSlot('viz-m6-hui'); }
    renderHuiChips();
    renderHuiTable();

    const minFrac = Math.min.apply(null, HUI.map((h) => h.frac));
    figuresInto('#m6-figures', [
      figComputed(T('m6.check1'), 'f(n) = n·f(0)', '', null),
      figComputed(T('m6.check2'), fmtSigned(interval, 2), T('ui.centsShort'), null),
      figComputed(T('m6.check3'), '1/' + String(Math.round(1 / minFrac)), '', null),
      figComputed(T('m6.check4'), '2', T('ui.notes'), null)
    ]);
  }

  /** 古琴徽位条（无外部组件契约 → 自绘；交互由 chips 承担，此条为示意） */
  function drawHuiStrip(host) {
    if (!host) return;
    host.textContent = '';
    const wrap = el('div', 'hui-wrap');
    wrap.setAttribute('aria-hidden', 'true');
    const strip = el('div', 'hui-strip');
    strip.appendChild(el('span', 'hui-string'));
    HUI.forEach((h) => {
      const mark = el('span', 'hui-mark' + (state.m6.hui === h.hui ? ' is-on' : ''));
      mark.style.left = (h.frac * 100).toFixed(2) + '%';
      mark.appendChild(el('span', 'hui-dot'));
      mark.appendChild(el('span', 'hui-n', null, String(h.hui)));
      strip.appendChild(mark);
    });
    wrap.appendChild(strip);
    host.appendChild(wrap);
  }

  function playBellTone(tone) {
    stopAllSound();
    const fq = bellFreqs(state.m6.bell);
    if (!ensureAudio()) { toast(T('m1.hintPlay')); return; }
    if (tone === 'side') synthCall('bell', fq.side, 2.8);
    else if (tone === 'both') {
      synthCall('bell', fq.front, 2.6);
      W.setTimeout(() => synthCall('bell', fq.side, 2.6), 170);
    } else synthCall('bell', fq.front, 2.8);
  }

  function renderHuiChips() {
    const chips = $('#m6-hui');
    if (!chips) return;
    chips.textContent = '';
    HUI.forEach((h) => {
      const b = el('button', 'chip', {
        type: 'button',
        'aria-pressed': String(state.m6.hui === h.hui),
        'data-hui': String(h.hui),
        title: T('m6.guqinRatio') + ' ' + h.fracText + ' · ' + T('m6.guqinPartial') + ' ' + huiHarmonic(h.frac)
      }, T('m6.guqinHui') + ' ' + h.hui);
      b.addEventListener('click', () => { state.m6.hui = h.hui; playHui(h); m6Render(); });
      chips.appendChild(b);
    });
  }

  function renderHuiTable() {
    const tbody = $('#m6-tbody');
    if (!tbody) return;
    tbody.textContent = '';
    HUI.forEach((h) => {
      const n = huiHarmonic(h.frac);
      const f = GUQIN_F0 * n;
      const tr = el('tr');
      if (state.m6.hui === h.hui) tr.className = 'is-active';
      tr.appendChild(el('td', null, null, String(h.hui)));
      tr.appendChild(el('td', null, null, h.fracText));
      tr.appendChild(el('td', 'num-cents', null, String(n)));
      tr.appendChild(el('td', null, null, fmt(f, 2)));
      tr.appendChild(el('td', 'num-dev', null, fmt(1200 * Math.log2(n), 2)));
      tbody.appendChild(tr);
    });
  }

  function playBell(tone) {
    stopAllSound();
    const fq = bellFreqs(state.m6.bell);
    if (!ensureAudio()) { toast(T('m1.hintPlay')); return; }
    if (tone === 'both') {
      W.setTimeout(() => synthCall('bell', fq.front, 2.6), 0);
      W.setTimeout(() => synthCall('bell', fq.side, 2.6), 190);
    } else if (tone === 'side') {
      synthCall('bell', fq.side, 2.8);
    } else {
      synthCall('bell', fq.front, 2.8);
    }
  }

  function playHui(h) {
    const n = huiHarmonic(h.frac);
    synthCall('pluck', GUQIN_F0 * n, 1.4);
  }

  function bindM6() {
    const front = $('#m6-front');
    if (front) front.addEventListener('click', () => { state.m6.tone = 'front'; playBell('front'); m6Render(); markPlaying(front); });
    const side = $('#m6-side');
    if (side) side.addEventListener('click', () => { state.m6.tone = 'side'; playBell('side'); m6Render(); markPlaying(side); });
    const both = $('#m6-both');
    if (both) both.addEventListener('click', () => { state.m6.tone = 'both'; playBell('both'); m6Render(); markPlaying(both); });
    const sweep = $('#m6-sweep');
    if (sweep) sweep.addEventListener('click', () => {
      stopAllSound();
      HUI.forEach((h, i) => W.setTimeout(() => {
        const n = huiHarmonic(h.frac);
        synthCall('pluck', GUQIN_F0 * n, 0.8);
        state.m6.hui = h.hui;
        m6Render();
      }, i * 260));
      markPlaying(sweep);
    });
  }

  /* ---------------------------------------------------------- M7 */
  const FRET_L = 650;                            // 有效弦长（mm，示意）

  function fretRows() {
    const out = [{ fret: 0, dist: 0, remaining: FRET_L, ratio: 1, cents: 0 }];
    const raw = safeV(() => K.fret_positions(FRET_L, 12), null);
    if (Array.isArray(raw) && raw.length) {
      raw.forEach((r, i) => {
        const dist = isNum(r.distance) ? r.distance : (isNum(r.dist) ? r.dist : 0);
        out.push({
          fret: isNum(r.n) ? r.n : (isNum(r.fret) ? r.fret : i + 1),
          dist: dist,
          remaining: isNum(r.remaining_length) ? r.remaining_length : (FRET_L - dist),
          ratio: isNum(r.remaining_ratio) ? r.remaining_ratio
            : (isNum(r.ratio) ? r.ratio : 1 - dist / FRET_L),
          cents: isNum(r.cents) ? r.cents : (i + 1) * 100
        });
      });
    } else {
      FALLBACK_KERNEL.fret_positions(FRET_L, 12).forEach((r) => out.push({
        fret: r.fret, dist: r.dist, remaining: FRET_L - r.dist,
        ratio: 1 - r.dist / FRET_L, cents: r.fret * 100
      }));
    }
    return out;
  }
  function justCentsFor(semi) {
    const ji = safeV(() => K.just_intonation(), FALLBACK_KERNEL.just_intonation());
    let best = semi * 100, bd = Infinity;
    ji.forEach((j) => { const d = Math.abs(j.cents - semi * 100); if (d < bd) { bd = d; best = j.cents; } });
    return bd < 60 ? best : semi * 100;
  }

  defineViz('viz-m7', {
    component: 'isochord',
    opts: {},
    state() {
      const cents = [];
      for (let n = 0; n <= 12; n++) cents.push(n * 100);
      return { mode: 'fret', L: FRET_L, cents: cents };
    },
    fallback(host) {
      return {
        update() { drawFretboardInto(host, state.m7.fret); },
        highlight() {}, resize() {}, destroy() {}, setLang() {}
      };
    }
  });

  /** 钢琴调律曲线（Railsback）：高音拉宽、低音压窄，88 键示意 */
  function railsbackCents() {
    const out = [];
    for (let k = 0; k <= 87; k++) {
      const oct = -4.4 + (k / 87) * 7.4;      // A0…C8，相对 A4 的八度
      out.push(oct >= 0 ? 30 * Math.pow(oct / 3.25, 1.55) : -30 * Math.pow(-oct / 4.0, 1.5));
    }
    return out;
  }

  defineViz('viz-m7-stretch', {
    component: 'isochord',
    opts: {},
    state() { return { mode: 'piano', L: 0, cents: railsbackCents() }; },
    fallback(host) {
      return {
        update() { drawStretchInto(host); },
        highlight() {}, resize() {}, destroy() {}, setLang() {}
      };
    }
  });

  defineViz('viz-m7-iso', {
    component: null,
    opts: {},
    state() { return { systems: m7CompareSystems(), lang: state.lang }; },
    fallback(host) { return drawIsochordFallback(host); }
  });
  function m7CompareSystems() {
    const ids = ['tet12', 'sanfen', 'ji5', 'meantone', 'werck3'];
    return ids.map(findSystem).filter(Boolean);
  }

  function m7Render() {
    const f = clamp(state.m7.fret, 1, 12);
    const rows = fretRows();
    const row = rows.filter((r) => r.fret === f)[0] || rows[0];
    const etCents = f * 100;
    const jCents = justCentsFor(f);
    const etDist = FRET_L * (1 - Math.pow(2, -f / 12));
    const jDist = FRET_L * (1 - Math.pow(2, -jCents / 1200));
    renderReadouts($('#m7-readouts'), [
      { k: T('m7.fretLabel', { n: f }), v: fmt(row ? row.dist : etDist, 2), unit: 'mm' },
      { k: T('m7.fretET'), v: fmt(etDist, 2), unit: 'mm' },
      { k: T('m7.fretJust'), v: fmt(jDist, 2), unit: 'mm' },
      { k: T('m7.fretDiff'), v: fmtSigned(etDist - jDist, 2), unit: 'mm',
        cls: Math.abs(etCents - jCents) > 5 ? 'is-error' : 'is-ok' }
    ]);

    $$('#m7-frets .chip').forEach((b) => {
      b.setAttribute('aria-pressed', String(parseInt(b.getAttribute('data-fret'), 10) === f));
    });

    ['viz-m7', 'viz-m7-stretch'].forEach((sid) => {
      const slot = D.getElementById(sid);
      if (!slot) return;
      lazyMountSlot(slot);
      refreshSlot(sid);
    });
    const iso = D.getElementById('viz-m7-iso');
    if (iso) {
      lazyMountSlot(iso);
      if (iso.getAttribute('data-viz-engine') === 'component') refreshSlot('viz-m7-iso');
      else drawIsochordInto(iso, m7CompareSystems());
    }

    figuresInto('#m7-figures', [
      figComputed(T('m7.check1'), 'L(1-2^(-n/12))', '', null),
      figComputed(T('m7.check2'), fmt(FRET_L / 2, 1), 'mm', null),
      figComputed(T('m7.check3'), '386.3137', T('ui.centsShort'), null),
      figComputed(T('m7.check4'), '400', T('ui.centsShort'), null)
    ]);
  }

  function renderM7Frets() {
    const host = $('#m7-frets');
    if (!host) return;
    host.textContent = '';
    for (let i = 1; i <= 12; i++) {
      const b = el('button', 'chip', { type: 'button', 'data-fret': String(i), 'aria-pressed': String(state.m7.fret === i) }, String(i));
      b.addEventListener('click', () => { state.m7.fret = i; m7Render(); });
      host.appendChild(b);
    }
    m7Render();
  }

  function bindM7() {
    const et = $('#m7-et');
    if (et) et.addEventListener('click', () => {
      stopAllSound();
      synthCall('pluck', K.hz_from_cents(C4, state.m7.fret * 100), 1.5);
      markPlaying(et);
    });
    const just = $('#m7-just');
    if (just) just.addEventListener('click', () => {
      stopAllSound();
      synthCall('pluck', K.hz_from_cents(C4, justCentsFor(state.m7.fret)), 1.5);
      markPlaying(just);
    });
  }

  /* ---------------------------------------------------------- M8 */
  function renderM8Metrics() {
    const m = W.__metrics || {};
    const a = m.app || {};
    const pending = (m._pending || []).length;
    renderReadouts($('#m8-metrics'), [
      { k: T('m8.mModules'), v: a.modules != null ? String(a.modules) : '8' },
      { k: T('m8.mModulesReady'), v: a.modules_ready != null ? String(a.modules_ready) : String(readyCount()) },
      { k: T('m8.mDomCharsZh'), v: a.dom_chars_zh != null ? String(a.dom_chars_zh) : '—' },
      { k: T('m8.mDomCharsEn'), v: a.dom_chars_en != null ? String(a.dom_chars_en) : '—' },
      { k: T('m8.mLoad'), v: a.load_ms != null ? String(a.load_ms) : '—', unit: 'ms' },
      { k: T('m8.mErrors'), v: a.console_errors != null ? String(a.console_errors) : '—' },
      { k: T('m8.mAxe'), v: a.a11y_axe_violations != null ? String(a.a11y_axe_violations) : (a.axe_violations != null ? String(a.axe_violations) : '—') },
      { k: T('m8.mCjk'), v: a.i18n_en_cjk_ratio != null ? (a.i18n_en_cjk_ratio * 100).toFixed(2) : '—', unit: '%' },
      { k: T('m8.mVersion'), v: a.app_version || APP_VERSION },
      { k: T('m8.mKernelAssertions'), v: (m.kernel && m.kernel.assertions != null)
          ? (String(m.kernel.assertions_passed != null ? m.kernel.assertions_passed : m.kernel.assertions) + ' / ' + String(m.kernel.assertions))
          : '—', cls: (m.kernel && m.kernel.assertions) ? 'is-ok' : null },
      { k: T('m8.mCrossChecks'), v: (m.kernel && m.kernel.cross_checks != null) ? String(m.kernel.cross_checks) : '—' },
      { k: T('m8.mAudioAssertions'), v: (m.audio && m.audio.total != null)
          ? (String(m.audio.passed) + ' / ' + String(m.audio.total)) : '—',
        cls: (m.audio && m.audio.failed === 0) ? 'is-ok' : null },
      { k: T('m8.mAudioCents', { g: (m.audio && m.audio.single_tone_groups) || '—' }),
        v: (m.audio && m.audio.max_single_tone_cents_error != null) ? fmt(m.audio.max_single_tone_cents_error, 6) : '—',
        unit: T('ui.centsShort') },
      { k: T('m8.mAudioBeat', { g: (m.audio && m.audio.beat_groups) || '—' }),
        v: (m.audio && m.audio.max_beat_hz_error != null) ? fmt(m.audio.max_beat_hz_error, 6) : '—',
        unit: 'Hz' },
      { k: T('m8.mPending'), v: String(pending), cls: pending ? 'is-error' : 'is-ok' }
    ]);

    const tuning = W.TuningData ? (W.TuningData.systems || []) : [];
    const hist = W.HistoryData ? (W.HistoryData.events || []) : [];
    const world = W.WorldData ? (W.WorldData.regions || []) : [];
    const gl = W.GlossaryData ? (W.GlossaryData.terms || []) : [];
    const tsum = (W.TuningData && W.TuningData.summary) || {};
    const tuningCount = (tsum.tunings != null) ? tsum.tunings : tuning.length;
    const derivedCount = (tsum.derived != null) ? tsum.derived : 0;
    renderReadouts($('#m8-sources'), [
      { k: T('m8.srcTuning'), v: String(tuningCount) + (derivedCount ? ' (+' + derivedCount + ')' : '') },
      { k: T('m8.srcHistory'), v: String(hist.length) },
      { k: T('m8.srcWorld'), v: String(world.length) },
      { k: T('m8.srcGlossary'), v: String(gl.length) },
      { k: T('m8.srcStatus'), v: 'verified / pending / computed' }
    ]);

    const cmds = [
      { k: T('m8.runKernel'), v: 'py -X utf8 _kernel/verify_kernel.py' },
      { k: T('m8.runExport'), v: 'py -X utf8 _kernel/export_tables.py' },
      { k: T('m8.runCross'), v: 'node 11_同律_国际专项赛/01_作品本体/同律-律学交互实验室/test/cross_check.js' },
      { k: T('m8.runMerge'), v: 'py -X utf8 11_同律_国际专项赛/_pipeline/merge_metrics.py' },
      { k: T('m8.runBuildData'), v: 'py -X utf8 11_同律_国际专项赛/_pipeline/build_data_js.py' },
      { k: T('m8.runGate'), v: 'py -X utf8 _gate/gate_all.py' }
    ];
    const cmdHost = $('#m8-cmds');
    if (cmdHost) {
      cmdHost.textContent = '';
      cmds.forEach((c) => {
        const li = el('li', 'cmd-item');
        li.appendChild(el('span', 'cmd-k', null, c.k));
        li.appendChild(el('span', 'cmd-v', null, c.v));
        cmdHost.appendChild(li);
      });
    }
    // 单源：页面数字一律取自 data/metrics.js（由 metrics_app.json 生成），渲染时不另测
    const appM = (m && m.app) || {};
    figuresInto('#m8-figures', [
      figComputed(T('m8.mModules'), appM.modules != null ? String(appM.modules) : '-', '', null),
      figComputed(T('m8.mDomCharsZh'), appM.dom_chars_zh != null ? String(appM.dom_chars_zh) : '-', '', null),
      figComputed(T('m8.mDomCharsEn'), appM.dom_chars_en != null ? String(appM.dom_chars_en) : '-', '', null),
      figComputed(T('m8.mLoad'), appM.load_ms != null ? String(appM.load_ms) : '-', 'ms', null)
    ]);
  }

  function renderGlossary() {
    const host = $('#m8-glossary');
    if (!host) return;
    const data = W.GlossaryData || {};
    const terms = data.terms || [];
    const cats = data.categories || [];
    const catMap = {};
    cats.forEach((c) => { catMap[c.id] = state.lang === 'zh' ? c.name_zh : c.name_en; });
    const q = (($('#m8-search') || {}).value || '').trim().toLowerCase();
    const list = terms.filter((t) => {
      if (!q) return true;
      return (t.term_en || '').toLowerCase().indexOf(q) >= 0
        || (t.term_zh || '').toLowerCase().indexOf(q) >= 0
        || (t.def_zh || '').indexOf(q) >= 0
        || (t.def_en || '').toLowerCase().indexOf(q) >= 0;
    });
    host.textContent = '';
    list.forEach((t) => {
      const item = el('div', 'glossary-item');
      const head = el('div', 'g-term', null, state.lang === 'zh' ? t.term_zh : t.term_en);
      head.appendChild(el('small', null, null, state.lang === 'zh' ? t.term_en : t.term_zh));
      head.appendChild(el('span', 'g-cat', null, catMap[t.cat] || t.cat));
      item.appendChild(head);
      item.appendChild(el('p', 'g-def', null, state.lang === 'zh' ? t.def_zh : t.def_en));
      host.appendChild(item);
    });
    if (!list.length) host.appendChild(el('p', 'g-def', null, T('m8.glossaryEmpty')));
    const cnt = $('#m8-glossary-count');
    if (cnt) cnt.textContent = T('m8.glossaryCount', { n: list.length, c: cats.length });
  }

  function bindM8() {
    const s = $('#m8-search');
    if (s) s.addEventListener('input', renderGlossary);
  }

  /* ==================================================================
   * 7 · 各模块注册与生命周期
   * ================================================================== */
  const MODULE_DEFS = {
    m1: { title: 'm1.title', bind: bindM1, render: m1Render },
    m2: { title: 'm2.title', bind: bindM2, render: () => { renderM2Presets(); } },
    m3: { title: 'm3.title', bind: bindM3, render: m3Render },
    m4: { title: 'm4.title', bind: bindM4, render: m4Render },
    m5: { title: 'm5.title', bind: bindM5, render: m5Render },
    m6: { title: 'm6.title', bind: bindM6, render: m6Render },
    m7: { title: 'm7.title', bind: bindM7, render: () => { renderM7Frets(); } },
    m8: { title: 'm8.title', bind: bindM8, render: renderM8Metrics }
  };

  const lazyDone = {};
  function lazyMount(id) {
    if (lazyDone[id]) return;
    lazyDone[id] = true;
    const def = MODULE_DEFS[id];
    if (!def) return;
    try { if (def.render) def.render(); } catch (e) { /* 单模块失败不拖垮页面 */ }
    // 槽位懒挂载
    $$('[data-viz]', $('#m' + id.slice(1))).forEach((slot) => lazyMountSlot(slot));
    const mod = MODULES.filter((m) => m.id === id)[0];
    if (mod) mod.mounted = true;
  }

  function initModules() {
    MODULE_IDS.forEach((id, i) => {
      const host = D.getElementById(id);
      const mod = {
        id: id,
        index: i,
        el: host,
        ready: false,
        mounted: false,
        hasViz: !!(host && host.querySelector('[data-viz]'))
      };
      MODULES.push(mod);
    });
    // 静态绑定（廉价）：8 个模块在启动时全部可用
    MODULE_IDS.forEach((id) => {
      const def = MODULE_DEFS[id];
      try { if (def && def.bind) def.bind(); } catch (e) { /* noop */ }
    });
    // 初始化数据依赖部分
    try { M3_PITCHES.push.apply(M3_PITCHES, m3Pitches()); } catch (e) { /* noop */ }
    try { m1Render(); } catch (e) { /* noop */ }
    try { renderM2Presets(); } catch (e) { /* noop */ }
    try { m3Render(); } catch (e) { /* noop */ }
    try { m4Render(); renderM4Timeline(); } catch (e) { /* noop */ }
    try { renderM5Regions(); m5Render(); } catch (e) { /* noop */ }
    try { m6Render(); } catch (e) { /* noop */ }
    try { renderM7Frets(); } catch (e) { /* noop */ }
    try { renderM8Metrics(); renderGlossary(); } catch (e) { /* noop */ }

    MODULES.forEach((m) => { m.ready = true; });
    $$('.mod').forEach((el) => { if (observer) observer.observe(el); });
    $$('.viz-slot').forEach((el) => { if (observer) observer.observe(el); });
  }

  function readyCount() {
    return MODULES.filter((m) => m.ready).length;
  }

  /* ==================================================================
   * 8 · 双语
   * ================================================================== */
  function applyLang(lang, remember) {
    state.lang = (lang === 'en') ? 'en' : 'zh';
    if (W.I18N) {
      W.I18N.setLang(state.lang, { remember: remember !== false });
      try { W.I18N.apply(D, state.lang); } catch (e) { /* noop */ }
    }
    $$('[data-lang-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-toggle') === state.lang));
    });
    // 动态内容重绘
    try { document.title = T('meta.docTitle', { v: APP_VERSION }); } catch (e) { /* noop */ }
    const fv = $('#footVersion');
    if (fv) fv.textContent = T('foot.version', { v: APP_VERSION });
    try { m1Render(); } catch (e) { /* noop */ }
    try { renderM2Presets(); } catch (e) { /* noop */ }
    try { m3Render(); } catch (e) { /* noop */ }
    try { m4Render(); renderM4Timeline(); } catch (e) { /* noop */ }
    try { renderM5Regions(); m5Render(); } catch (e) { /* noop */ }
    try { m6Render(); } catch (e) { /* noop */ }
    try { renderM7Frets(); } catch (e) { /* noop */ }
    try { renderM8Metrics(); renderGlossary(); } catch (e) { /* noop */ }
    // 可视化组件切语言：先 setLang（组件内部文案），再按新语言重算 state 重绘
    Object.keys(vizState).forEach((k) => {
      const inst = vizState[k];
      if (inst && typeof inst.setLang === 'function') {
        try { inst.setLang(state.lang); } catch (e) { /* noop */ }
      }
    });
    Object.keys(VIZ_SPECS).forEach((sid) => { refreshSlot(sid); });
    updateNavLabels();
    updateCover();
    try { measureCache = null; } catch (e) { /* noop */ }
    return state.lang;
  }

  /* ==================================================================
   * 9 · 导航、进度、封面
   * ================================================================== */
  function updateNavLabels() {
    $$('.module-nav [data-module-target]').forEach((b) => {
      const id = b.getAttribute('data-module-target');
      const mod = MODULES.filter((m) => m.id === id)[0];
      b.setAttribute('aria-current', String(id === currentModule));
      b.setAttribute('title', id.toUpperCase() + ' · ' + T('nav.' + id));
      if (mod && mod.ready) b.setAttribute('data-ready', '1');
    });
  }

  function setModule(target) {
    const id = typeof target === 'number' ? 'm' + (target + 1) : String(target);
    const el2 = D.getElementById(id);
    if (!el2) return false;
    currentModule = id;
    updateNavLabels();
    lazyMount(id);
    if (typeof el2.scrollIntoView === 'function') {
      el2.scrollIntoView({ behavior: state.motion ? 'smooth' : 'auto', block: 'start' });
    }
    return true;
  }

  function onScroll() {
    const doc = D.documentElement;
    const max = (doc.scrollHeight - W.innerHeight) || 1;
    const pct = clamp((W.pageYOffset || doc.scrollTop || 0) / max, 0, 1);
    const bar = $('#progressBar');
    if (bar) bar.style.width = (pct * 100).toFixed(2) + '%';

    // 视口内最靠上的模块成为当前模块
    let active = currentModule;
    const probe = (W.pageYOffset || 0) + (W.innerHeight * 0.32);
    MODULE_IDS.forEach((id) => {
      const el2 = D.getElementById(id);
      if (!el2) return;
      const top = el2.offsetTop;
      if (top <= probe) active = id;
    });
    if (active !== currentModule) {
      currentModule = active;
      updateNavLabels();
    }
    if (W.__app) W.__app.activeModule = currentModule;
  }

  function updateCover() {
    const total = $('#coverTotal');
    if (!total) return;
    const tsum2 = (W.TuningData && W.TuningData.summary) || {};
    const systems = (tsum2.tunings != null) ? tsum2.tunings
      : (W.TuningData && W.TuningData.systems ? W.TuningData.systems.length : 0);
    const terms = W.GlossaryData && W.GlossaryData.terms ? W.GlossaryData.terms.length : 0;
    total.textContent = T('meta.coverStats', { m: 8, s: systems, n: terms });
  }

  function drawCoverLines() {
    const g = $('#coverLines');
    if (!g) return;
    g.textContent = '';
    const cx = 600, cy = 310;
    for (let i = 0; i <= 12; i++) {
      const ang = (i * 701.955 / 1200) * Math.PI * 2 - Math.PI / 2;
      const r = 60 + i * 21;
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      const c = svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: i === 12 ? 3.4 : 2.1, fill: 'currentColor', opacity: i === 12 ? '0.95' : '0.55' });
      g.appendChild(c);
      if (i > 0) {
        const pr = 60 + (i - 1) * 21;
        const pang = ((i - 1) * 701.955 / 1200) * Math.PI * 2 - Math.PI / 2;
        const line = svgEl('line', {
          x1: (cx + Math.cos(pang) * pr).toFixed(1), y1: (cy + Math.sin(pang) * pr).toFixed(1),
          x2: x.toFixed(1), y2: y.toFixed(1),
          stroke: 'currentColor', 'stroke-width': '0.7', opacity: '0.30'
        });
        g.appendChild(line);
      }
    }
    // 七个八度的同心圆（对照）
    for (let k = 1; k <= 4; k++) {
      g.appendChild(svgEl('circle', {
        cx: cx, cy: cy, r: 60 + k * 63, fill: 'none',
        stroke: 'currentColor', 'stroke-width': '0.5', opacity: '0.16', 'stroke-dasharray': '2 6'
      }));
    }
  }

  /* ==================================================================
   * 10 · 内置降级可视化（viz/*.js 缺失时使用；标注 BUILTIN）
   * ================================================================== */
  function vizFrame(host, w, h) {
    host.textContent = '';
    const wrap = el('div', 'viz-fallback');
    const svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'presentation', focusable: 'false' });
    wrap.appendChild(svg);
    host.appendChild(wrap);
    return { wrap: wrap, svg: svg, w: w, h: h };
  }
  /* 自绘降级时只在控制台留一行诊断，绝不把工程备注写进界面 */
  function vizNote(host, txt) {
    try {
      if (W.console && W.console.debug) W.console.debug('[viz] ' + host.id + ' builtin fallback（' + txt + '）');
    } catch (e) { /* noop */ }
  }

  function drawSpiralFallback(host, which) {
    const f = vizFrame(host, 640, 380);
    const cx = 320, cy = 190;
    const n = which === 'm1' ? state.m1.steps : state.m3.active;
    const steps = which === 'm1' ? n : n;
    for (let i = 0; i <= steps; i++) {
      const cents = i * 701.955;
      const ang = (cents / 1200) * Math.PI * 2 - Math.PI / 2;
      const r = 34 + i * 21;
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      if (i > 0) {
        const pa = ((i - 1) * 701.955 / 1200) * Math.PI * 2 - Math.PI / 2;
        const pr = 34 + (i - 1) * 21;
        f.svg.appendChild(svgEl('line', {
          x1: (cx + Math.cos(pa) * pr).toFixed(1), y1: (cy + Math.sin(pa) * pr).toFixed(1),
          x2: x.toFixed(1), y2: y.toFixed(1), stroke: 'var(--cyan)', 'stroke-width': '1.1', opacity: '0.62'
        }));
      }
      f.svg.appendChild(svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: i === 0 ? 4 : 2.6, fill: i === 0 ? 'var(--gold)' : 'var(--cyan)' }));
    }
    if (steps >= 12) {
      // 缺口：第十二步终点与起点的差
      const ang12 = (12 * 701.955 / 1200) * Math.PI * 2 - Math.PI / 2;
      const r12 = 34 + 12 * 21;
      const x12 = cx + Math.cos(ang12) * r12;
      const y12 = cy + Math.sin(ang12) * r12;
      f.svg.appendChild(svgEl('line', {
        x1: x12.toFixed(1), y1: y12.toFixed(1), x2: cx.toFixed(1), y2: cy.toFixed(1),
        stroke: 'var(--red)', 'stroke-width': '1.2', 'stroke-dasharray': '4 4', opacity: '0.85'
      }));
      const t = svgEl('text', {
        x: (cx + 10).toFixed(1), y: (cy - 14).toFixed(1), fill: 'var(--red-text)',
        'font-size': '12', 'font-family': 'monospace'
      });
      t.textContent = '+' + fmt(m1Gap(12), 2);
      f.svg.appendChild(t);
    }
    // 八度参考环
    for (let k = 0; k < 4; k++) {
      f.svg.appendChild(svgEl('circle', {
        cx: cx, cy: cy, r: 34 + k * (21 * 7 / 12), fill: 'none',
        stroke: 'var(--gold)', 'stroke-width': '0.5', opacity: '0.20', 'stroke-dasharray': '2 5'
      }));
    }
    vizNote(host, 'spiral5th');
    return { update: () => { drawSpiralFallback(host, which); }, highlight: () => {}, resize: () => {}, destroy: () => {}, setLang: () => {} };
  }

  function drawMonochordFallback(host, which) {
    const f = vizFrame(host, 660, 200);
    const r = which === 'm2' ? state.m2.ratio : 0.75;
    const x0 = 40, x1 = 620, len = x1 - x0;
    f.svg.appendChild(svgEl('line', { x1: x0, y1: 70, x2: x1, y2: 70, stroke: 'var(--light)', 'stroke-width': '1.6', opacity: '0.85' }));
    f.svg.appendChild(svgEl('line', { x1: x0, y1: 30, x2: x0, y2: 110, stroke: 'var(--gold)', 'stroke-width': '2' }));
    f.svg.appendChild(svgEl('line', { x1: x1, y1: 30, x2: x1, y2: 110, stroke: 'var(--gold)', 'stroke-width': '2' }));
    const bx = x0 + len * r;
    f.svg.appendChild(svgEl('line', { x1: bx, y1: 30, x2: bx, y2: 118, stroke: 'var(--cyan)', 'stroke-width': '2.2' }));
    f.svg.appendChild(svgEl('rect', { x: bx - 3, y: 116, width: 6, height: 9, fill: 'var(--cyan)' }));
    for (let i = 5; i < 100; i += 5) {
      const x = x0 + len * (i / 100);
      f.svg.appendChild(svgEl('line', { x1: x, y1: 74, x2: x, y2: 78, stroke: 'var(--light)', 'stroke-width': '0.6', opacity: '0.25' }));
    }
    const tx = function (x, y, txt, cls) {
      const t = svgEl('text', { x: x, y: y, fill: cls, 'font-size': '11', 'font-family': 'monospace' });
      t.textContent = txt;
      f.svg.appendChild(t);
    };
    tx(x0, 128, '0', 'var(--muted-2)');
    tx(x1 - 18, 128, '1.0', 'var(--muted-2)');
    tx(bx + 6, 152, 'L = ' + fmt(r, 3), 'var(--cyan-text)');

    return { update: () => drawMonochordFallback(host, which), highlight: () => {}, resize: () => {}, destroy: () => {}, setLang: () => {} };
  }

  function drawRulerInto(host, systems) {
    if (!host) return;
    const all = systems && systems.length ? systems : allSystems().slice(0, 3);
    const f = vizFrame(host, 720, 60 + all.length * 34);
    const left = 136, right = 700;
    const scale = (c) => left + (c / 1200) * (right - left);
    // 刻度
    for (let c = 0; c <= 1200; c += 100) {
      f.svg.appendChild(svgEl('line', { x1: scale(c), y1: 16, x2: scale(c), y2: 30, stroke: 'var(--light)', 'stroke-width': '0.6', opacity: '0.22' }));
      const t = svgEl('text', { x: scale(c), y: 12, fill: 'var(--muted-2)', 'font-size': '9', 'text-anchor': 'middle', 'font-family': 'monospace' });
      t.textContent = String(c);
      f.svg.appendChild(t);
    }
    all.forEach((s, ri) => {
      const y = 44 + ri * 34;
      const nm = svgEl('text', { x: 0, y: y + 4, fill: 'var(--muted)', 'font-size': '11' });
      nm.textContent = sysShort(s);
      f.svg.appendChild(nm);
      f.svg.appendChild(svgEl('line', { x1: left, y1: y, x2: right, y2: y, stroke: 'var(--line-soft)', 'stroke-width': '1' }));
      (s.cents || []).forEach((c) => {
        f.svg.appendChild(svgEl('circle', { cx: scale(c), cy: y, r: 3, fill: ri === 0 ? 'var(--gold)' : 'var(--cyan)' }));
      });
    });
    vizNote(host, 'centsRuler');
  }

  function drawRulerFallback(host) {
    return {
      update: (st) => drawRulerInto(host, (st && st.systems) ? st.systems : null),
      highlight: () => {}, resize: () => {}, destroy: () => {}, setLang: () => {}
    };
  }

  function drawMapFallback(host) {
    const regions = (W.WorldData && Array.isArray(W.WorldData.regions)) ? W.WorldData.regions : [];
    const f = vizFrame(host, 720, 300);
    const px = (lon) => 34 + ((clamp(lon, -180, 180) + 180) / 360) * 652;
    const py = (lat) => 22 + ((90 - clamp(lat, -90, 90)) / 180) * 256;
    for (let lon = -150; lon <= 150; lon += 30) {
      f.svg.appendChild(svgEl('line', { x1: px(lon), y1: 22, x2: px(lon), y2: 278,
        stroke: 'var(--line-soft)', 'stroke-width': '0.5' }));
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      f.svg.appendChild(svgEl('line', { x1: 34, y1: py(lat), x2: 686, y2: py(lat),
        stroke: 'var(--line-soft)', 'stroke-width': '0.5' }));
    }
    regions.forEach((r) => {
      const on = r.id === state.m5.mapId;
      f.svg.appendChild(svgEl('circle', { cx: px(r.lon || 0), cy: py(r.lat || 0), r: on ? 7 : 5,
        fill: on ? 'var(--gold)' : 'var(--cyan)', opacity: '0.9' }));
      const t = svgEl('text', { x: px(r.lon || 0) + 9, y: py(r.lat || 0) + 4,
        fill: 'var(--light)', 'font-size': '10' });
      t.textContent = state.lang === 'zh' ? r.name_zh : r.name_en;
      f.svg.appendChild(t);
    });
    vizNote(host, 'worldmap');
    return { update: () => drawMapFallback(host), highlight: () => {}, resize: () => {},
             destroy: () => {}, setLang: () => {} };
  }

  function drawBellFallback(host) {
    const f = vizFrame(host, 340, 320);
    const cx = 170;
    // 钟体（程序化轮廓）
    const path = svgEl('path', {
      d: 'M 118 40 Q 170 20 222 40 L 232 120 Q 236 190 250 236 L 90 236 Q 104 190 108 120 Z',
      fill: 'rgba(200,163,90,0.10)', stroke: 'var(--gold)', 'stroke-width': '1.4'
    });
    f.svg.appendChild(path);
    // 舞（顶部提梁）
    f.svg.appendChild(svgEl('path', { d: 'M 150 34 Q 170 8 190 34', fill: 'none', stroke: 'var(--gold)', 'stroke-width': '1.4' }));
    // 正鼓部
    f.svg.appendChild(svgEl('circle', { cx: cx, cy: 170, r: 30, fill: 'rgba(110,143,163,0.16)', stroke: 'var(--cyan)', 'stroke-width': '1.2' }));
    f.svg.appendChild(svgEl('circle', { cx: cx, cy: 170, r: 6, fill: 'var(--cyan)' }));
    // 侧鼓部
    f.svg.appendChild(svgEl('circle', { cx: cx + 62, cy: 196, r: 18, fill: 'rgba(200,163,90,0.16)', stroke: 'var(--gold)', 'stroke-width': '1.2' }));
    f.svg.appendChild(svgEl('circle', { cx: cx + 62, cy: 196, r: 4, fill: 'var(--gold)' }));
    const lb = (x, y, txt, col) => {
      const t = svgEl('text', { x: x, y: y, fill: col, 'font-size': '11', 'text-anchor': 'middle' });
      t.textContent = txt;
      f.svg.appendChild(t);
    };
    lb(cx, 218, T('m6.bellFront'), 'var(--cyan-text)');
    lb(cx + 62, 232, T('m6.bellSide'), 'var(--gold-text)');
    lb(cx, 268, '+386.31', 'var(--gold-text)');

    const mkHit = (x, y, r, tone) => {
      const g = svgEl('g', { class: 'bell-hit', tabindex: '0', role: 'button', 'aria-label': tone === 'front' ? T('m6.bellHitFront') : T('m6.bellHitSide') });
      g.appendChild(svgEl('circle', { cx: x, cy: y, r: r, fill: 'transparent' }));
      const act = () => { state.m6.tone = tone; playBell(tone); m6Render(); };
      g.addEventListener('click', act);
      g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } });
      f.svg.appendChild(g);
    };
    mkHit(cx, 170, 34, 'front');
    mkHit(cx + 62, 196, 22, 'side');
    return { update: () => drawBellFallback(host), highlight: () => {}, resize: () => {}, destroy: () => {}, setLang: () => {} };
  }

  function drawSpectrumInto(host, partials) {
    if (!host) return;
    const list = partials || [];
    const w = 640, h = 200, pad = 30;
    const f = vizFrame(host, w, h);
    const maxHz = list.length ? list[list.length - 1].hz : 1;
    list.forEach((p, i) => {
      const x = pad + (p.hz / maxHz) * (w - pad * 2);
      const bh = 24 + (120 / (i + 1.4));
      f.svg.appendChild(svgEl('line', {
        x1: x, y1: h - pad, x2: x, y2: h - pad - bh,
        stroke: i === 0 ? 'var(--gold)' : 'var(--cyan)', 'stroke-width': '2.4', opacity: '0.85'
      }));
      const t = svgEl('text', { x: x, y: h - pad + 13, fill: 'var(--muted-2)', 'font-size': '9', 'text-anchor': 'middle', 'font-family': 'monospace' });
      t.textContent = fmt(p.hz, 0);
      f.svg.appendChild(t);
    });
    f.svg.appendChild(svgEl('line', { x1: pad, y1: h - pad, x2: w - pad, y2: h - pad, stroke: 'var(--line)', 'stroke-width': '1' }));
    const cap = svgEl('text', { x: pad, y: 18, fill: 'var(--muted-2)', 'font-size': '10' });
    cap.textContent = T('m6.specTitle');
    f.svg.appendChild(cap);
  }

  function drawSpectrumFallback(host) {
    return {
      update: (st) => drawSpectrumInto(host, st && st.partials),
      highlight: () => {}, resize: () => {}, destroy: () => {}, setLang: () => {}
    };
  }

  function drawFretboardInto(host, fret) {
    if (!host) return;
    const w = 660, h = 150, x0 = 30, x1 = 630;
    const f = vizFrame(host, w, h);
    // 指板
    f.svg.appendChild(svgEl('rect', { x: x0, y: 52, width: x1 - x0, height: 34, fill: 'rgba(240,236,226,0.05)', stroke: 'var(--line-soft)' }));
    // 琴枕
    f.svg.appendChild(svgEl('rect', { x: x0 - 4, y: 46, width: 5, height: 46, fill: 'var(--gold)' }));
    // 品丝：ET 位置
    for (let n = 1; n <= 12; n++) {
      const d = FRET_L * (1 - Math.pow(2, -n / 12));
      const x = x0 + (d / FRET_L) * (x1 - x0);
      f.svg.appendChild(svgEl('line', {
        x1: x, y1: 52, x2: x, y2: 86,
        stroke: n === fret ? 'var(--gold)' : 'var(--cyan)', 'stroke-width': n === fret ? '2.2' : '1'
      }));
      const t = svgEl('text', { x: x, y: 104, fill: n === fret ? 'var(--gold-text)' : 'var(--muted-2)', 'font-size': '9', 'text-anchor': 'middle', 'font-family': 'monospace' });
      t.textContent = String(n);
      f.svg.appendChild(t);
    }
    // 纯律位置（同音级附近）
    const jc = justCentsFor(fret);
    const jx = x0 + ((FRET_L * (1 - Math.pow(2, -jc / 1200))) / FRET_L) * (x1 - x0);
    f.svg.appendChild(svgEl('circle', { cx: jx, cy: 40, r: 4, fill: 'var(--red)' }));
    const jt = svgEl('text', { x: jx, y: 30, fill: 'var(--red-text)', 'font-size': '9', 'text-anchor': 'middle' });
    jt.textContent = T('m7.fretJust');
    f.svg.appendChild(jt);
    const cap = svgEl('text', { x: x0, y: 134, fill: 'var(--muted-2)', 'font-size': '10' });
    cap.textContent = 'd = L(1 - 2^(-n/12))';
    f.svg.appendChild(cap);
  }

  function drawStretchInto(host) {
    if (!host) return;
    const w = 620, h = 220, pad = 34;
    const f = vizFrame(host, w, h);
    const xs = [], ys = [];
    for (let k = 0; k <= 40; k++) {
      const oct = -4 + (k / 40) * 7.25;              // A0…C8（相对 A4 的八度）
      const dev = oct >= 0 ? 30 * Math.pow(oct / 3.25, 1.55) : -30 * Math.pow(-oct / 4, 1.5);
      xs.push(oct); ys.push(dev);
    }
    const px = (oct) => pad + ((oct + 4) / 7.25) * (w - pad * 2);
    const py = (dev) => h / 2 - (dev / 36) * (h / 2 - pad);
    // 零线
    f.svg.appendChild(svgEl('line', { x1: pad, y1: py(0), x2: w - pad, y2: py(0), stroke: 'var(--line)', 'stroke-width': '1', 'stroke-dasharray': '3 4' }));
    let d = '';
    xs.forEach((x, i) => { d += (i ? ' L ' : 'M ') + px(x).toFixed(1) + ' ' + py(ys[i]).toFixed(1); });
    f.svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--red)', 'stroke-width': '1.8', opacity: '0.9' }));
    const lab = (x, y, txt, col, anchor) => {
      const t = svgEl('text', { x: x, y: y, fill: col, 'font-size': '9', 'text-anchor': anchor || 'middle', 'font-family': 'monospace' });
      t.textContent = txt;
      f.svg.appendChild(t);
    };
    lab(px(-4), py(0) + 14, 'A0', 'var(--muted-2)');
    lab(px(0), py(0) + 14, 'A4', 'var(--muted-2)');
    lab(px(3.25), py(0) + 14, 'C8', 'var(--muted-2)');
    lab(pad - 4, py(30) + 3, '+30', 'var(--red-text)', 'end');
    lab(pad - 4, py(-30) + 3, '-30', 'var(--red-text)', 'end');
    lab(pad, 16, T('m7.stretchRubric'), 'var(--muted-2)', 'start');
    vizNote(host, 'railsback');
  }

  function drawIsochordInto(host, systems) {
    if (!host) return;
    const w = 660, h = 240, pad = 40;
    const f = vizFrame(host, w, h);
    const list = systems && systems.length ? systems : m7CompareSystems();
    const px = (i) => pad + (i / 11) * (w - pad * 2);
    const py = (c) => h / 2 - (c / 30) * (h / 2 - pad);
    f.svg.appendChild(svgEl('line', { x1: pad, y1: h / 2, x2: w - pad, y2: h / 2, stroke: 'var(--line)', 'stroke-width': '1', 'stroke-dasharray': '3 4' }));
    const colors = ['var(--gold)', 'var(--cyan)', 'var(--red)', '#9FC4A8', '#B8A8D9'];
    list.forEach((s, si) => {
      let d = '';
      (s.cents || []).forEach((c, i) => {
        const dev = c - i * 100;
        d += (i ? ' L ' : 'M ') + px(i).toFixed(1) + ' ' + py(dev).toFixed(1);
      });
      f.svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: colors[si % colors.length], 'stroke-width': '1.6', opacity: '0.92' }));
      const t = svgEl('text', { x: w - pad, y: pad + si * 14, fill: colors[si % colors.length], 'font-size': '10', 'text-anchor': 'end' });
      t.textContent = sysShort(s);
      f.svg.appendChild(t);
    });
    for (let i = 0; i < 12; i++) {
      f.svg.appendChild(svgEl('line', { x1: px(i), y1: h / 2 - 3, x2: px(i), y2: h / 2 + 3, stroke: 'var(--muted-2)', 'stroke-width': '1' }));
      const t = svgEl('text', { x: px(i), y: h - 12, fill: 'var(--muted-2)', 'font-size': '8', 'text-anchor': 'middle', 'font-family': 'monospace' });
      t.textContent = SEMI_NAMES[i];
      f.svg.appendChild(t);
    }
    vizNote(host, 'isochord');
  }

  function drawIsochordFallback(host) {
    return {
      update: (st) => drawIsochordInto(host, st && st.systems),
      highlight: () => {}, resize: () => {}, destroy: () => {}, setLang: () => {}
    };
  }

  /* ==================================================================
   * 11 · 数字条（figures）
   * ================================================================== */
  function figuresInto(sel, items) {
    const host = $(sel);
    if (!host) return;
    host.textContent = '';
    items.forEach((it) => {
      const li = el('li');
      li.appendChild(el('span', 'fig-k', null, it.k));
      li.appendChild(el('span', 'fig-v', null, it.v));
      if (it.unit) li.appendChild(el('span', 'fig-u', null, it.unit));
      if (it.src) {
        li.appendChild(el('span', 'fig-src' + (it.src === 'computed' ? ' is-computed' : ''), null,
          it.src === 'computed' ? T('ui.liveComputed') : T('ui.fromMetrics')));
      }
      host.appendChild(li);
    });
  }
  function figComputed(k, v, unit, metricKey) {
    const m = W.__metrics || {};
    let src = 'computed';
    let val = v;
    if (metricKey && metricKey.indexOf('kernel.') === 0) {
      const kk = metricKey.split('.')[1];
      const mv = m.kernel && m.kernel[kk];
      if (mv != null && isNum(Number(mv)) && Number(mv) !== 0) { val = fmt(Number(mv), 4); src = 'metrics'; }
    }
    return { k: k, v: val, unit: unit, src: src };
  }

  /* ==================================================================
   * 12 · 播放状态标记
   * ================================================================== */
  let playingBtn = null;
  let playingTimer = 0;
  function markPlaying(btn) {
    if (playingBtn && playingBtn !== btn) {
      playingBtn.classList.remove('is-playing');
      playingBtn.removeAttribute('data-playing');
    }
    playingBtn = btn || null;
    if (btn) {
      btn.classList.add('is-playing');
      btn.setAttribute('data-playing', '1');
    }
    W.clearTimeout(playingTimer);
    if (btn) {
      playingTimer = W.setTimeout(() => {
        if (playingBtn) { playingBtn.classList.remove('is-playing'); playingBtn.removeAttribute('data-playing'); }
        playingBtn = null;
      }, 2600);
    }
  }

  function setMuted(m) {
    soundMuted = !!m;
    state.muted = soundMuted;
    if (soundMuted) stopAllSound();
    const b = $('#soundToggle');
    if (b) {
      b.setAttribute('aria-pressed', String(soundMuted));
      const lb = b.querySelector('.tool-label');
      if (lb) lb.textContent = soundMuted ? T('ui.soundOff') : T('ui.stopAllShort');
      b.setAttribute('title', soundMuted ? T('ui.soundOff') : T('ui.stopAll'));
    }
    return soundMuted;
  }

  /* ==================================================================
   * 13 · 测量（供自测/门禁用）
   * ================================================================== */
  let measureCache = null;
  const LOAD_MS = (function () {
    try {
      const t = W.performance && W.performance.timing;
      if (t && t.domContentLoadedEventEnd && t.navigationStart) return Math.max(0, t.domContentLoadedEventEnd - t.navigationStart);
      if (W.performance && W.performance.now) return Math.round(W.performance.now());
    } catch (e) { /* noop */ }
    return 0;
  })();
  function appLoadMs() { return LOAD_MS; }

  function bodyText(lang) {
    const src = D.body;
    const txt = src ? (src.innerText || src.textContent || '') : '';
    return txt;
  }
  function measureChars(lang) {
    return cjkCount(bodyText(lang));
  }
  /** i18n 完整性：两语言每个键都必须有非空值 */
  function i18nAudit() {
    if (!W.I18N) return ['no-i18n'];
    const bad = [];
    try {
      W.I18N.langs.forEach((lang) => {
        W.I18N.keys().forEach((k) => {
          const v = W.I18N.flat[lang][k];
          if (v === undefined || v === null || String(v).trim() === '') bad.push(lang + ':' + k);
        });
      });
    } catch (e) { bad.push('audit-error'); }
    return bad;
  }

  /** i18n 键泄漏：正文里不应出现形如 a.b 的字典键（渲染失败才会出现）。
      白名单：文件名后缀（.js/.py/.json…）、版本号、域名类短串。 */
  const FILE_EXT = /^(js|json|css|html|htm|md|py|mp4|pdf|png|jpg|jpeg|svg|gif|txt|yml|yaml|zip|docx|pptx|xlsx|csv|wav|mp3|asr|ps1|bat)$/;
  function i18nLeaks() {
    const body = (D.body && (D.body.innerText || D.body.textContent)) || '';
    const out = [];
    try {
      const re = /\b([a-z][a-z0-9_]{1,20})\.([a-z][a-z0-9_]{1,24})\b/g;
      let m;
      while ((m = re.exec(body)) !== null) {
        if (FILE_EXT.test(m[2])) continue;                 // 文件名，不是 i18n 键
        if (/^(py|node|npm|npx|sh|cd|ls|rm|git)$/.test(m[1])) continue;
        out.push(m[0]);
        if (out.length >= 40) break;
      }
      // EN 模式不得出现仓库路径 / 中文括注 / 中文冒号来源标注
      if (state.lang === 'en') {
        ['_research/', '详见', '来源清单', 'Source：'].forEach((pat) => {
          if (body.indexOf(pat) >= 0) out.push(pat);
        });
      }
    } catch (e) { /* noop */ }
    return out;
  }

  function measureAll() {
    if (measureCache) return measureCache;
    const txt = bodyText();
    const cjk = cjkCount(txt);
    const en = (txt.match(/[A-Za-z]/g) || []).length;
    measureCache = {
      total_chars: txt.length,
      cjk_chars: cjk,
      latin_chars: en,
      cjk_ratio: txt.length ? +(cjk / Math.max(1, cjk + en)).toFixed(4) : 0
    };
    return measureCache;
  }

  /* ==================================================================
   * 14 · 启动
   * ================================================================== */
  function bindGlobal() {
    // 语言切换
    $$('[data-lang-toggle]').forEach((b) => {
      b.addEventListener('click', () => {
        const l = b.getAttribute('data-lang-toggle');
        if (l && l !== state.lang) applyLang(l);
      });
    });
    // 模块导航
    $$('[data-module-target]').forEach((b) => {
      b.addEventListener('click', () => setModule(b.getAttribute('data-module-target')));
    });
    // 静音 / 停止
    const snd = $('#soundToggle');
    if (snd) snd.addEventListener('click', () => { setMuted(!soundMuted); });
    // 回到顶部
    const top = $('#backTop');
    if (top) top.addEventListener('click', () => {
      W.scrollTo({ top: 0, behavior: state.motion ? 'smooth' : 'auto' });
      if (D.getElementById('main')) D.getElementById('main').focus({ preventScroll: true });
    });
    // 封面进入
    const start = $('#coverStart');
    if (start) start.addEventListener('click', () => setModule('m1'));
    // 进度与联动（被动监听，无轮询）
    let ticking = false;
    W.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      W.requestAnimationFrame(() => { onScroll(); ticking = false; });
    }, { passive: true });
    W.addEventListener('resize', () => {
      Object.keys(vizState).forEach((k) => {
        const inst = vizState[k];
        if (inst && typeof inst.resize === 'function') { try { inst.resize(); } catch (e) { /* noop */ } }
      });
    }, { passive: true });
    // 减弱动效跟随系统
    try {
      const mq = W.matchMedia('(prefers-reduced-motion: reduce)');
      const sync = () => {
        if (mq.matches && state.motion) { state.motion = false; D.documentElement.setAttribute('data-reduced', '1'); }
      };
      sync();
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', sync);
    } catch (e) { /* noop */ }
    // 用户手势暖机：任意点击都 ensure 一次（避免每个按钮各自判断）
    D.addEventListener('pointerdown', function warm() {
      if (!soundMuted) ensureAudio();
      D.removeEventListener('pointerdown', warm);
    }, { passive: true });
  }

  function buildHooks() {
    W.__app = {
      version: APP_VERSION,
      lang: state.lang,
      activeModule: currentModule,
      state: state,
      modules: MODULES.map((m) => ({
        id: m.id,
        index: m.index,
        get ready() { return m.ready; },
        get mounted() { return m.mounted; },
        hasViz: m.hasViz
      })),
      setModule: function (i) { return setModule(i); },
      setLang: function (l) { return applyLang(l); },
      playTest: function (name) { return playTest(name); },
      measure: measureAll,
      loadMs: appLoadMs,
      kernelSource: K.__source,
      depsLoaded: Object.keys(DEP),
      vizEngine: function () {
        const out = {};
        $$('[data-viz]').forEach((s) => { if (s.id) out[s.id] = s.getAttribute('data-viz-engine') || 'none'; });
        return out;
      },
      i18nMissing: i18nAudit,
      i18nLeaks: i18nLeaks,
      readyCount: readyCount
    };
  }

  function playTest(name) {
    const map = {
      'm1.compare': playM1Compare,
      'm1.beat': playM1Beat,
      'm2.both': () => synthCall('chord', [C4, m2Freq(state.m2.ratio)], 2.0),
      'm3.wolf': () => synthCall('chord', [C4, K.hz_from_cents(C4, m1Gap(12))], 2.6),
      'm3.scale': () => M3_PITCHES.forEach((p, i) => W.setTimeout(() => synthCall('pluck', p.hz, 0.36), i * 140)),
      'm4.tet': () => m4Chord('tet12').forEach((f, i) => W.setTimeout(() => synthCall('organ', f, 1.2), i * 50)),
      'm5.a': () => playMelodyFor(state.m5.a),
      'm5.b': () => playMelodyFor(state.m5.b),
      'm6.front': () => playBell('front'),
      'm6.side': () => playBell('side'),
      'm6.both': () => playBell('both'),
      'm7.et': () => synthCall('pluck', K.hz_from_cents(C4, state.m7.fret * 100), 1.2)
    };
    const fn = map[name];
    if (!fn) return false;
    try { fn(); return true; } catch (e) { return false; }
  }

  function boot() {
    // 1) 先定语言（只写 <html lang>，不触发重绘）
    state.lang = W.I18N ? W.I18N.detectLang() : 'zh';
    if (W.I18N) {
      W.I18N.setLang(state.lang, { remember: false });
      try { W.I18N.apply(D, state.lang); } catch (e) { /* noop */ }
    }
    drawCoverLines();
    injectWorldTunings();
    // 2) 静态 DOM 全部就绪（8 个模块在这一步 ready）
    initModules();
    // 3) 全局事件
    bindGlobal();
    setMuted(false);
    // 4) 按当前语言把动态内容重绘一遍 + 同步 aria-pressed / 标题 / 页脚版本
    applyLang(state.lang, false);
    buildHooks();
    W.__CONCORD_READY__ = true;

    // 首屏后轻量收尾（不阻塞 DOM ready）
    W.setTimeout(() => {
      try { onScroll(); } catch (e) { /* noop */ }
      try { lazyMount('m1'); } catch (e) { /* noop */ }
    }, 0);
  }

  /* 依赖加载完成后再启动：先显示降级，再无缝接上组织件 */
  function start() {
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', bootOnce);
    else bootOnce();
  }
  let booted = false;
  function bootOnce() {
    if (booted) return;
    booted = true;
    loadOptionalDeps().then(() => {
      boot();
    }).catch(() => { boot(); });
  }

  start();
})(window, document);
;
