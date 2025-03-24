import { createContext } from "react";

// Initialize with default values for all context properties
export const GlobalState = createContext({
  modalVisible: false,
  setModalVisible: () => {},
  refreshBookings: false,
  setRefreshBookings: () => {}
});