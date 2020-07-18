
var load        = require('acidlisp/require')(__dirname, null, {
  sys: {
    log_s: log_s,
    log_i: function (s) {
      console.log(s)
      return s
    }
  }
})

function log_s (s) {
  var string = strings.memory.slice(
      s + 4, s + 4 + strings.memory.readUInt32LE(s)
    )
  console.log(string.toString())
  return s
}

var strings = load('../')
var tape        = require('tape')

function create (s) {
  s = Buffer.from(s)
  var p = strings.create(s.length)
  s.copy(strings.memory, p+4)
  return p
}

tape('compare', function (t) {
  var hello  = create('hello')
  var hello2 = create('hello')
  var abc    = create('abc')
  var acab   = create('acab')
  t.equal(strings.compare(hello, hello), 0)
  t.equal(strings.compare(hello, hello2), 0)
  t.equal(strings.compare(hello2, hello2), 0)
  t.equal(strings.compare(abc, abc), 0)
  t.equal(strings.compare(abc, acab), -1)
  t.equal(strings.compare(acab, abc), 1)
  t.equal(strings.compare(acab, acab), 0)
  t.end()
})

tape('slice', function (t) {
  var a = create('a')
  var abc = create('abc')
  var acab = create("acab")
  var ab = strings.slice(abc, 0, 2)
  log_s(ab)
  t.equal(strings.length(ab), 2)
  t.end()
})

return
//var syms        = require('../symbols')
//var parse       = require('../parse')
//var hydrate     = require('../hydrate')
//var ev          = require('../eval')
//var unroll      = require('../unroll')
//var compileWat  = require('../compile/wat')
//var {
//  isArray, isBoolean, isNumber, readBuffer
//} = require('../util')

var {
  stringify, isBuffer, readBuffer
} = require('../util')

var createEnv = require('../env')
function envify(ary) {
  if(!isArray(ary)) return ary
  var _env = {}
  ary.forEach(([k, v]) => _env[k.description] = {value: v})
  return _env
}
var inputs = [
  '(compare "abc" "abc")',
  '(compare "abc" "abd")',
  '(compare "abc" "abb")',
  '(equal_at "abc" 0 "abc" 0 3)',
  '(equal_at "abc" 0 "abd" 0 3)',
  '(equal_at "abc" 0 "abb" 0 2)',
  '(slice "hi there" 1 4)',

  '(concat "hello" ", world")',

//  `(block
//    (def hmyj "hello mellow yellow jello")
//    (def hello (slice hmyj 0 5))
//    {join [list
//      hello hello hello
//      (concat "h" (slice hmyj 10 12))
//      (slice hmyj 9 12)] " "})`
]

function toFun (src) {
  return stringify([syms.fun, [], acid.parse(src)])
}

function toModule (src) {
  return stringify([syms.module,
    [syms.export, [syms.fun, [], acid.parse(src)]]])
}

var outputs = [
  0,
  -1,
  1,

  1,
  0,
  1,

  Buffer.from('i t'),
  Buffer.from('hello, world'),
//  Buffer.from('hello hello hello how low'),
]

inputs.forEach(function (v, i) {
  tape(inputs[i] + ' => '+JSON.stringify(outputs[i].toString()), t => {

    var env = createEnv(Buffer.alloc(65536), {0:0})
    var load = require('../load')(__dirname, env)
    env.__proto__ = envify(load('../lib/strings'))
    var ast = hydrate(parse(inputs[i]), env)
    var value = ev(ast, env)

    if(isNumber(outputs[i]))
      t.equal(stringify(+value), stringify(outputs[i]), 'eval, correct output')
    else
      t.equal(stringify(readBuffer(env.memory, value)), stringify(outputs[i]), 'eval, correct output')

    var m = toModule(inputs[i])
    console.log("M", m)

    try {
      var fn = acid.wasm(m, env)
    } catch (e) {
      acid.wat(m, env)
      throw e
    }
    if(isBuffer(outputs[i])) {
      var ptr = fn()
      t.deepEqual(readBuffer(fn.memory, ptr), outputs[i])
    }
    else
      t.equal(fn(), outputs[i], 'wasm correct output')
    t.end()
  })
})
