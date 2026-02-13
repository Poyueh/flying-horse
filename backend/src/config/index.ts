export const config = {
  port: 3001,
  jwtSecret: 'flying-horse-secret-key-change-in-production',
  jwtExpiresIn: '7d',
  defaultBalance: 5000,
  defaultBetList: [
    0.20, 0.40, 0.60, 0.80,
    1.00, 1.20, 1.40, 1.60, 1.80, 2.00,
    3.00, 4.00, 5.00, 6.00, 7.00, 8.00, 9.00, 10.00,
    15.00, 20.00, 25.00, 30.00, 35.00, 40.00, 45.00, 50.00
  ],
  defaultRTP: 0.96,
  mulSteps: [2, 5, 10, 25, 50, 100, 200, 500, 1000, 10000],
};
