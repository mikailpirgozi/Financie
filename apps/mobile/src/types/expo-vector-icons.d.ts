/**
 * Type declarations for @expo/vector-icons
 */
declare module '@expo/vector-icons' {
  import type { ComponentClass } from 'react';
  import type { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export type IconComponentType = ComponentClass<IconProps> & {
    glyphMap: Record<string, number>;
  };

  export const Ionicons: IconComponentType;
  export const MaterialIcons: IconComponentType;
  export const MaterialCommunityIcons: IconComponentType;
  export const FontAwesome: IconComponentType;
  export const FontAwesome5: IconComponentType;
  export const FontAwesome6: IconComponentType;
  export const Feather: IconComponentType;
  export const AntDesign: IconComponentType;
  export const Entypo: IconComponentType;
  export const EvilIcons: IconComponentType;
  export const Foundation: IconComponentType;
  export const Octicons: IconComponentType;
  export const SimpleLineIcons: IconComponentType;
  export const Zocial: IconComponentType;
}
