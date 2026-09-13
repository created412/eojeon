export const RANK = { D: 0, C: 1, B: 2, A: 3 }

export function canMove(control) {
  return control !== 'D'
}

export function isRoomOpen(control, room) {
  return RANK[control] >= RANK[room.minControl]
}

export function openRooms(control, rooms) {
  return rooms.filter(r => isRoomOpen(control, r))
}
