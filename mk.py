import random

def oreder_with_count(itrable: list):
    new_list = []
    for i in itrable:
        if not len(new_list) == 0:
            if i in new_list[0]:
                continue
        else:
            count = itrable.count(i)
            new_list.append([i, count])


def count():
    numbers = [i for i in range(99)]
    chosen = []
    itr = 0
    while not len(set(chosen)) == 99:
        itr += 1
        chose = random.choice(numbers)
        chosen.append(chose)
    return itr

def calculate(itr):
    tottal = 0
    for _ in range(itr):
        tottal += count()
    return tottal/itr

master = 0
tottal = 0
real_avrage = 512.35
while True:
    master += 1
    avrage = calculate(master * 500)
    tottal += avrage
    real_avrage = tottal/master
    print(f"{avrage:.3f}, {real_avrage:.3f}")
    


