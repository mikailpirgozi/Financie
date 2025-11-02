declare module 'react-native-onboarding-swiper' {
  import { ComponentType, ReactElement } from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  export interface PageType {
    backgroundColor: string;
    image: ReactElement;
    title: string;
    subtitle: string;
  }

  interface ButtonProps {
    onPress?: () => void;
    isLight?: boolean;
  }

  export interface OnboardingProps {
    pages: PageType[];
    onDone?: () => void;
    onSkip?: () => void;
    showSkip?: boolean;
    skipLabel?: string;
    nextLabel?: string;
    doneLabel?: string;
    bottomBarHighlight?: boolean;
    titleStyles?: TextStyle;
    subTitleStyles?: TextStyle;
    containerStyles?: ViewStyle;
    imageContainerStyles?: ViewStyle;
    allowFontScaling?: boolean;
    pageIndexCallback?: (index: number) => void;
    controlStatusBar?: boolean;
    statusBarStyle?: 'light-content' | 'dark-content' | 'default';
    transitionAnimationDuration?: number;
    DoneButtonComponent?: ComponentType<ButtonProps>;
    SkipButtonComponent?: ComponentType<ButtonProps>;
    NextButtonComponent?: ComponentType<ButtonProps>;
    DotComponent?: ComponentType<{ selected: boolean }>;
  }

  const Onboarding: ComponentType<OnboardingProps>;
  export default Onboarding;
}

