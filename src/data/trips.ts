export type Trip = {
  id: string
  name: string
  cities: string[]
}

export const trips: Trip[] = [
  { id: 'rosa-euro', name: 'Rosas Europe trip', cities: ['London', 'Paris'] },
  { id: 'finn-aus', name: 'Finn Cairns', cities: ['Cairns'] },
]