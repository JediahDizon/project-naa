package com.projectnaa;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.cmcewen.blurview.BlurViewPackage;
import com.dooboolab.RNAudioRecorderPlayerPackage;
import com.otomogroove.OGReactNativeWaveform.OGWavePackage;
import com.punarinta.RNSoundLevel.RNSoundLevel;
import com.kevinresol.react_native_sound_recorder.RNSoundRecorderPackage;
import com.entria.views.RNViewOverflowPackage;
import com.inprogress.reactnativeyoutube.ReactNativeYouTube;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.AlexanderZaytsev.RNI18n.RNI18nPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new BlurViewPackage(),
            new RNAudioRecorderPlayerPackage(),
            new OGWavePackage(),
            new RNSoundLevel(),
            new RNSoundRecorderPackage(),
            new RNViewOverflowPackage(),
            new ReactNativeYouTube(),
            new RNFetchBlobPackage(),
            new VectorIconsPackage(),
            new LinearGradientPackage(),
            new RNI18nPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
