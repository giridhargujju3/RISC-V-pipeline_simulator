.section .text
.globl _start

_start:
    addi x1, x0, 5      # x1 = 5
    addi x2, x0, 3      # x2 = 3
    add x3, x1, x2      # x3 = 8 (5 + 3)
    sub x4, x3, x1      # x4 = 3 (8 - 5) <- RAW hazard on x3
    add x5, x4, x2      # x5 = 6 (3 + 3) <- RAW hazard on x4
    add x6, x5, x3      # x6 = 14 (6 + 8)
    sub x7, x6, x4      # x7 = 11 (14 - 3)
    and x8, x7, x5      # x8 = 2 (11 & 6)
    add x9, x8, x6      # x9 = 16 (2 + 14)
    sub x10, x9, x7     # x10 = 5 (16 - 11)
