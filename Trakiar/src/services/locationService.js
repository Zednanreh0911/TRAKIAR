import * as Location from "expo-location";

export const getSearchLocation = async () => {
  if (
    typeof navigator !== "undefined" &&
    navigator.product === "ReactNativeWeb"
  ) {
    return null;
  }

  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitud: position.coords.latitude,
      longitud: position.coords.longitude,
    };
  } catch {
    return null;
  }
};
