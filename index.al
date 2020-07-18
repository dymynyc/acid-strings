(module
  (def log_s (system "sys" "log_s" (i)))
  (def log_i (system "sys" "log_i" (i)))

  ;; string format: length(i32) data(bytes){length}
  (def mem (import "acid-memory"))

  (def min {fun [x y] (if (lt x y) x y)})
  (def length {fun [w] (i32_load w)})

  (def at (fun [s I2] {i32_load8 (add 4 s I2)}))

  (def set_at (fun [s I3 v] {i32_store8 (add 4 s I3) v}))

  (export length length)
  (export at at)
  (export set_at set_at)

  (def create (fun (len) {block
    (def s (mem.alloc (add 4 len)))
    (i32_store s len)
    s
  }))

  (export create create)

  (def range (fun (start end initial reduce)
    ((fun R (acc i)
      (if (lt i end) (R (reduce acc i) (add 1 i)) acc)
    ) initial start)
  ))

  (export equal_at {fun [a a_start b b_start len]
    (if
      ;; if neither string is long enough, false
      (gt len (min
        (sub (length a) a_start)
        (sub (length b) b_start) ))
      0
      ;;returns 1 or 0
      ((fun R (i)
        (if (and (lt i len)
              [eq (at a (add a_start i)) (at b (add b_start i))])
              (R (add 1 i))
          (eq i len)) ;;return true if we made it to end
      ) 0)
    )})

  ;; compare each character up to length of shortest input
  ;; else the long one is greater
  (export compare {fun [a b]
    (if (eq a b) 0
      (block
        (def len {min (length a) (length b)})
        ;;returns 0 or 1 or -1
        ((fun R (acc i)
          (if (and (lt i len) (eq 0 acc))
            (R (sub (at a i) (at b i)) (add 1 i))
            acc) ;;return true if we made it to end
        ) 0 0)
      )
    )
  })

  (export slice {fun (str start end) [block
    (def len [sub (if end end (length str)) start])
    (def _str (create len))
  ;;  (log_i len)
    (range 0 len 0 (fun (acc j) (block
;;      (log_i 9999) (log_i i)
;;      (log_i {at str (add start i)})
;;      (log_i 0)
;;      (log_i j)
      [set_at _str j {at str (add start j)}]
    )))
    _str
  ]})

  ;;haha, some bounds checking and errors would be good here
  (def copy {fun (source s_start s_end target t_start)
    (range 0 (sub s_end s_start) 0 (fun (acc i) ;;all the way to end
      (set_at target [add t_start i] [at source (add s_start i)])
    ))
  })

  (export copy copy)
  (export concat {fun (a b) [block
    (def c (create [add (length a) (length b)]))
    (copy a 0 (length a) c 0)
    (copy b 0 (length b) c (length a))
    c
  ]})
)
