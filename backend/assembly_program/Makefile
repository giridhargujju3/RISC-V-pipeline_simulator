AS      = riscv64-unknown-elf-as
OBJCOPY = riscv64-unknown-elf-objcopy

SRCS = $(wildcard *.S)
OBJS = $(SRCS:.S=.o)
BINS = $(SRCS:.S=.bin)

all: $(BINS)

%.o: %.S
	$(AS) $< -o $@

%.bin: %.o
	$(OBJCOPY) -O binary $< $@

clean:
	rm -f *.o *.bin
