from sklearn.linear_model import LinearRegression
import numpy as np
import joblib

# Dummy training data: y = 2x + 1
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([3, 5, 7, 9, 11])

model = LinearRegression()
model.fit(X, y)

joblib.dump(model, 'model.pkl')
print('Model trained and saved as model.pkl') 