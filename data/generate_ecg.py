import scipy.signal as signal
import numpy as np
import pywt
import json

# Generation referenced from: https://stackoverflow.com/questions/4387878/simulator-of-realistic-ecg-signal-from-rr-data-for-matlab-or-python

# The "Daubechies" wavelet is a rough approximation to a real,
# single, heart beat ("pqrst") signal
pqrst = np.array(pywt.Wavelet('db10').dec_lo)

# Add the gap after the pqrst when the heart is resting.
samples_rest = 10
zero_array = np.zeros(samples_rest, dtype=float)
pqrst_full = np.concatenate([pqrst, zero_array])

# For a health, athletic, person, 60 is resting, 180 is intensive exercising
bpm_values = [int(x) for x in range(30, 300)]  # Pregenerate for all BPMS


# Simulated period of time in seconds that the ecg is captured in
capture_length = 5

# Sampling config
sampling_rate = 100.0
num_samples = int(sampling_rate * capture_length)

all_ecg = {}

for bpm in bpm_values:
    bps = bpm / 60

    # Calculate the number of beats in capture time period
    # Round the number to simplify things
    num_heart_beats = int(capture_length * bps)

    # Concatenate together the number of heart beats needed
    ecg_template = np.tile(pqrst_full, num_heart_beats)

    # Simulate an ADC by sampling the ecg template to produce the values
    ecg_sampled = signal.resample(ecg_template, num_samples)

    # Scale the normalised amplitude to fit the D3 y-axis domain [0, 200]
    ecg_min = ecg_sampled.min()
    ecg_max = ecg_sampled.max()
    ecg_scaled = 30 + (ecg_sampled - ecg_min) / (ecg_max - ecg_min) * 140

    # Build time-value pairs
    time_step = capture_length / num_samples
    data = [{"time": round(i * time_step, 4), "value": round(float(v), 2)}
            for i, v in enumerate(ecg_scaled)]

    all_ecg[str(bpm)] = data

with open("ecg_clean.json", "w") as f:
    json.dump(all_ecg, f)
