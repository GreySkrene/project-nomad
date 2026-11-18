# Lenovo Legion Go 8APU1 — offline and low-power operation

This applies to the original Legion Go 8APU1 / machine type 83E1, not Legion Go
S or Legion Go Gen 2.

## Prepare while internet is available

- Install stable Windows, Lenovo, Legion Space, BIOS, and driver updates only
  after checking Lenovo's support notes. Keep local copies of critical
  documents and installers.
- Open NOMAD, Kolibri, Kiwix, maps, and LM Studio once before disconnecting so
  each application can finish local setup.
- Download any required local AI model and test that LM Studio can load it with
  Wi-Fi disabled.
- Keep a local Windows sign-in method that does not depend on internet access.

## Minimum-power reference mode

1. Press **Legion L + Y** until Quiet mode is selected. Lenovo rates Quiet mode
   at an 8 W thermal target on the original 8APU1.
2. In Windows, choose **Settings → System → Power & battery → Best power
   efficiency**, and enable Energy Saver.
3. Lower display brightness, select 60 Hz, turn off controller vibration, and
   disable Bluetooth/Wi-Fi when they are not needed.
4. Use Kiwix, Kolibri, maps, and stored PDFs without loading a local AI model.
   Start the AI only for questions that ordinary search cannot answer, then
   unload it when finished.
5. Prefer hibernate or a full shutdown for long idle periods; sleep continues
   consuming battery.

The Legion Go accepts USB-C Power Delivery through either USB4 port. Use a
properly rated USB-C cable and power source; the original Lenovo adapter is
65 W. Lower-power sources may charge slowly or lose battery while the device is
running.

Source: Lenovo's official Legion Go 8APU1 user guide and PSREF.

