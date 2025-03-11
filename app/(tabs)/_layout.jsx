import Ionicons from '@expo/vector-icons/Ionicons';
import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  return (
      <Drawer>
        <Drawer.Screen name='Home/index' options={{title:"Home", drawerIcon:({color})=><Ionicons name="home" size={32} color={color} />}}/>
        <Drawer.Screen name='About' options={{title:"About", drawerIcon:({color})=><Ionicons name="information-circle-outline" size={32} color={color} />}}/>
      </Drawer>
  );
}
