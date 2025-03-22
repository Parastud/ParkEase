import React,{useState} from 'react'
import Login from './Login'
import Register from './Register'
import { TouchableOpacity,View,Text } from 'react-native'
import { SafeAreaView } from 'react-native'
const Loginscreen = () => {
    const [Screen, setScreen] = useState(true)
    const handlePress = ()=>{
      setScreen(!Screen)
    }

  return (
    <View className='w-full h-full'>

    {Screen ? <Login/> : <Register/>}
    <View className="absolute bottom-12 flex-row self-center">
        <Text className="text-gray-600">
          {Screen ? "Don't have an account? " : "Already have an account? "}
        </Text>
        <TouchableOpacity onPress={handlePress}>
          <Text className="text-blue-500 font-medium">
            {Screen ? "Register" : "Login"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default Loginscreen