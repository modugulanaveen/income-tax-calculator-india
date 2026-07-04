import { calculatePF } from './src/utils/pfCalculator.js';
const samples = [15000, 5000, 18000, 12000];
for (const s of samples) {
  const r = calculatePF(s);
  console.log(s, r.epfWages, r.epfEe, r.eps, r.epfEr, r.edli, r.adminCharge, r.edliAdminCharge, r.totalEmployerContribution, r.totalContribution);
}
