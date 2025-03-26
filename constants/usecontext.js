import { createContext } from "react";


export const GlobalState = createContext({
  modalVisible: false,
  setModalVisible: () => {},
  refreshBookings: false,
  setRefreshBookings: () => {}
});
