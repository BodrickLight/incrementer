export interface Upgrade {
  id: string,
  name: string,
  apply(state: any): void,
  increaseCost(state: any): void,
  shouldUnlock(state: any): boolean,
}

export interface UpgradeState {
  cost: Costs,
}

export interface Costs {
  [index: string]: number,
  AX?: number,
  BX?: number,
}
