use std::cmp::min;
use std::env::temp_dir;
use std::fs::{remove_file, write};
use std::process::Command;

use hound::{SampleFormat, WavSpec, WavWriter};
use parking_lot::MutexGuard;

use crate::blip_buf::BlipBuf;
use crate::channel::SharedChannel;
use crate::pyxel::{Pyxel, CHANNELS};
use crate::settings::{CLOCKS_PER_TICK, CLOCK_RATE, NUM_SAMPLES, SAMPLE_RATE};
use crate::utils;

struct AudioCore {
    blip_buf: BlipBuf,
}

impl pyxel_platform::AudioCallback for AudioCore {
    fn update(&mut self, out: &mut [i16]) {
        let channels = CHANNELS.lock();
        Audio::render_samples(&channels, &mut self.blip_buf, out);
    }
}

pub struct Audio {}

impl Audio {
    pub fn new(sample_rate: u32, num_samples: u32) -> Self {
        let mut blip_buf = BlipBuf::new(NUM_SAMPLES as usize);
        blip_buf.set_rates(CLOCK_RATE as f64, SAMPLE_RATE as f64);
        pyxel_platform::start_audio(
            sample_rate,
            1,
            num_samples as u16,
            new_shared_type!(AudioCore { blip_buf }),
        );
        Self {}
    }

    pub fn render_samples(
        channels_: &MutexGuard<'_, Vec<SharedChannel>>,
        blip_buf: &mut BlipBuf,
        samples: &mut [i16],
    ) {
        let mut channels: Vec<_> = channels_.iter().map(|channel| channel.lock()).collect();
        let mut num_samples = blip_buf.read_samples(samples, false);
        while num_samples < samples.len() {
            for channel in &mut *channels {
                channel.update(blip_buf);
            }
            blip_buf.end_frame(CLOCKS_PER_TICK as u64);
            num_samples += blip_buf.read_samples(&mut samples[num_samples..], false);
        }
    }

    pub fn save_samples(filename: &str, samples: &[i16], ffmpeg: bool) {
        // Save WAV file
        let spec = WavSpec {
            channels: 1,
            sample_rate: SAMPLE_RATE,
            bits_per_sample: 16,
            sample_format: SampleFormat::Int,
        };
        let filename = utils::add_file_extension(filename, ".wav");
        let mut writer = WavWriter::create(&filename, spec)
            .unwrap_or_else(|_| panic!("Failed to open file '{filename}'"));
        for sample in samples {
            writer.write_sample(*sample).unwrap();
        }
        writer.finalize().unwrap();

        // Save MP4 file
        if !ffmpeg {
            return;
        }
        let image_data = include_bytes!("assets/pyxel_logo_152x64.png");
        let image_path = temp_dir().join("pyxel_mp4_image.png");
        let png_file = image_path.to_str().unwrap();
        let wav_file = &filename;
        let mp4_file = filename.replace(".wav", ".mp4");
        write(&image_path, image_data).unwrap();
        Command::new("ffmpeg")
            .arg("-loop")
            .arg("1")
            .arg("-i")
            .arg(png_file)
            .arg("-f")
            .arg("lavfi")
            .arg("-i")
            .arg("color=c=black:s=480x360")
            .arg("-i")
            .arg(wav_file)
            .arg("-filter_complex")
            .arg("[1][0]overlay=(W-w)/2:(H-h)/2")
            .arg("-c:v")
            .arg("libx264")
            .arg("-c:a")
            .arg("aac")
            .arg("-b:a")
            .arg("192k")
            .arg("-shortest")
            .arg(mp4_file)
            .arg("-y")
            .output()
            .unwrap_or_else(|e| panic!("Failed to execute FFmpeg: {e}"));
        remove_file(png_file).unwrap();
    }
}

impl Pyxel {
    pub fn play(
        &self,
        channel_index: u32,
        sequence: &[u32],
        start_tick: Option<u32>,
        should_loop: bool,
        should_resume: bool,
    ) {
        if sequence.is_empty() {
            return;
        }
        let sounds = sequence
            .iter()
            .map(|sound_index| self.sounds.lock()[*sound_index as usize].clone())
            .collect();
        self.channels.lock()[channel_index as usize].lock().play(
            sounds,
            start_tick,
            should_loop,
            should_resume,
        );
    }

    pub fn play1(
        &self,
        channel_index: u32,
        sound_index: u32,
        start_tick: Option<u32>,
        should_loop: bool,
        should_resume: bool,
    ) {
        self.channels.lock()[channel_index as usize].lock().play1(
            self.sounds.lock()[sound_index as usize].clone(),
            start_tick,
            should_loop,
            should_resume,
        );
    }

    pub fn playm(&self, music_index: u32, start_tick: Option<u32>, should_loop: bool) {
        let num_channels = self.channels.lock().len();
        let musics = self.musics.lock();
        let music = musics[music_index as usize].lock();
        for i in 0..min(num_channels, music.seqs.len()) {
            self.play(
                i as u32,
                &music.seqs[i].lock(),
                start_tick,
                should_loop,
                false,
            );
        }
    }

    pub fn stop(&self, channel_index: u32) {
        self.channels.lock()[channel_index as usize].lock().stop();
    }

    pub fn stop0(&self) {
        let num_channels = self.channels.lock().len();
        for i in 0..num_channels {
            self.stop(i as u32);
        }
    }

    pub fn play_pos(&self, channel_index: u32) -> Option<(u32, u32)> {
        self.channels.lock()[channel_index as usize]
            .lock()
            .play_pos()
    }
}
