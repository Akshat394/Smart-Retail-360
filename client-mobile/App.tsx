import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Dashboard from './screens/Dashboard';
import OrderDetails from './screens/OrderDetails';
import QRScanner from './screens/QRScanner';
import Toast from 'react-native-toast-message';

export type RootStackParamList = {
  Dashboard: undefined;
  OrderDetails: { orderId: string };
  QRScanner: { orderId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="OrderDetails" component={OrderDetails} />
        <Stack.Screen name="QRScanner" component={QRScanner} />
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}
