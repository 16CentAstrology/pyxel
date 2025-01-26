use crate::audio::Audio;
use crate::blip_buf::BlipBuf;
use crate::pyxel::{CHANNELS, SOUNDS};
use crate::settings::{CLOCK_RATE, SAMPLE_RATE, TICKS_PER_SECOND};

pub type SharedSeq = shared_type!(Vec<u32>);

#[derive(Clone)]
pub struct Music {
    pub seqs: Vec<SharedSeq>,
}

pub type SharedMusic = shared_type!(Music);

impl Music {
    pub fn new() -> SharedMusic {
        new_shared_type!(Self { seqs: Vec::new() })
    }

    pub fn set(&mut self, seqs: &[Vec<u32>]) {
        self.seqs = seqs
            .iter()
            .map(|seq| new_shared_type!(seq.clone()))
            .collect();
        let num_channels = CHANNELS.lock().len();
        while self.seqs.len() < num_channels {
            self.seqs.push(new_shared_type!(Vec::new()));
        }
    }

    pub fn save(&self, filename: &str, count: u32, ffmpeg: Option<bool>) {
        assert!(count > 0);
        let channels = CHANNELS.lock();
        let num_channels = channels.len();
        let seqs: Vec<_> = (0..num_channels)
            .map(|i| {
                let pyxel_sounds = SOUNDS.lock();
                if self.seqs.is_empty() {
                    Vec::new()
                } else {
                    self.seqs[i]
                        .lock()
                        .iter()
                        .map(|&sound_index| pyxel_sounds[sound_index as usize].clone())
                        .collect::<Vec<_>>()
                }
            })
            .collect();
        let ticks_per_music = seqs
            .iter()
            .map(|sounds| {
                sounds
                    .iter()
                    .map(|sound| {
                        let sound = sound.lock();
                        sound.speed * sound.notes.len() as u32
                    })
                    .sum::<u32>()
            })
            .max()
            .unwrap();
        let samples_per_music = ticks_per_music * SAMPLE_RATE / TICKS_PER_SECOND;
        let num_samples = samples_per_music * count;
        if num_samples == 0 {
            return;
        }
        let mut samples = vec![0; num_samples as usize];
        let mut blip_buf = BlipBuf::new(num_samples as usize);
        blip_buf.set_rates(CLOCK_RATE as f64, SAMPLE_RATE as f64);
        {
            let mut channels: Vec<_> = channels.iter().map(|channel| channel.lock()).collect();
            for i in 0..num_channels {
                channels[i].stop();
                channels[i].play(seqs[i].clone(), None, true, false);
            }
        }
        Audio::render_samples(&channels, &mut blip_buf, &mut samples);
        Audio::save_samples(filename, &samples, ffmpeg.unwrap_or(false));
        channels.iter().for_each(|channel| channel.lock().stop());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_music_new() {
        let music = Music::new();
        assert_eq!(music.lock().seqs.len(), 0);
    }

    #[test]
    fn test_music_set() {
        let music = Music::new();
        music
            .lock()
            .set(&[vec![0, 1, 2], vec![1, 2, 3], vec![2, 3, 4]]);
        for i in 0..3 {
            assert_eq!(
                &*music.lock().seqs[i as usize].lock(),
                &vec![i, i + 1, i + 2]
            );
        }
    }
}
