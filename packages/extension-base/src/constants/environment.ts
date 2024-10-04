const PRODUCTION_BRANCHES = ['master', 'webapp', 'webapp-dev'];
const branchName = process.env.BRANCH_NAME || 'subwallet-dev';

export const isProductionMode = PRODUCTION_BRANCHES.indexOf(branchName) > -1;
