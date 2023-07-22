import math
levels = [
    (2, 20),
    (3, 30),
    (4, 40),
    (5, 50),
    (6, 60),
    (7, 70),
    (8, 80),
    (9, 90),
]


levels = [(ppl, r, (math.pi * r**2) / 1000) for ppl, r in levels]


levels = [(*l, (l[2] / l[0])) for l in levels]
print(levels)


# use matplotlib to plot the data with density as the y axis and number of people as the x axis
import matplotlib.pyplot as plt
import numpy as np

x = [l[1] for l in levels]
y = [l[3] for l in levels]
plt.plot(x, y)
plt.title('proxy status')
plt.xlabel('proxy radius')
plt.ylabel('Density required to proxy per km2')
# include slope
m, b = np.polyfit(x, y, 1)
plt.plot(x, m*np.array(x) + b)

plt.show()
