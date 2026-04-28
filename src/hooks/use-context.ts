
import { AppContext } from "@/lib/contextApi/AppProvider";
import { AppContextType } from "@/interface/common.interface";
import { useContext } from "react"
const useGlobalContext = () => {
  return useContext(AppContext) as AppContextType
}

export default useGlobalContext;