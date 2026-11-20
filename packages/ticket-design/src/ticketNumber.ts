const TICKET_NUMBER_DIGITS = 6;

export const formatTicketNumber = (ticketNumber: number) =>
  String(ticketNumber).padStart(TICKET_NUMBER_DIGITS, "0");
