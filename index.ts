import 'react-native-gesture-handler';
import { LogBox } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// Set global error handler to capture and log any unhandled fatal or non-fatal JS errors
// @ts-ignore
if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
  // @ts-ignore
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.log('GLOBAL ERROR', isFatal, error?.message, error?.stack);
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
