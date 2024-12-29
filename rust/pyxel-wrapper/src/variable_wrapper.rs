use pyo3::exceptions::PyAttributeError;
use pyo3::prelude::*;

use crate::channel_wrapper::Channel;
use crate::image_wrapper::Image;
use crate::music_wrapper::Music;
use crate::pyxel_singleton::pyxel;
use crate::sound_wrapper::Sound;
use crate::tilemap_wrapper::Tilemap;
use crate::tone_wrapper::Tone;

wrap_as_python_list!(
    Colors,
    u32, // Dummy
    (|_| pyxel().colors.lock().len()),
    pyxel::Rgb24,
    (|_, index| pyxel().colors.lock()[index]),
    pyxel::Rgb24,
    (|_, index, value| pyxel().colors.lock()[index] = value),
    Vec<pyxel::Rgb24>,
    (|_, list| *pyxel().colors.lock() = list),
    (|_| pyxel().colors.lock().clone())
);

macro_rules! wrap_shared_vec_as_python_list {
    ($wrapper_name:ident, $value_type:ident, $field_name:ident) => {
        wrap_as_python_list!(
            $wrapper_name,
            u32, // Dummy
            (|_| pyxel().$field_name.lock().len()),
            $value_type,
            (|_, index: usize| $value_type::wrap(pyxel().$field_name.lock()[index].clone())),
            $value_type,
            (|_, index, value: $value_type| pyxel().$field_name.lock()[index] = value.inner),
            Vec<$value_type>,
            (|_, list: Vec<$value_type>| *pyxel().$field_name.lock() =
                list.iter().map(|value| value.inner.clone()).collect()),
            (|_| pyxel()
                .$field_name
                .lock()
                .iter()
                .map(|value| $value_type::wrap(value.clone()))
                .collect())
        );
    };
}

wrap_shared_vec_as_python_list!(Images, Image, images);
wrap_shared_vec_as_python_list!(Tilemaps, Tilemap, tilemaps);
wrap_shared_vec_as_python_list!(Channels, Channel, channels);
wrap_shared_vec_as_python_list!(Tones, Tone, tones);
wrap_shared_vec_as_python_list!(Sounds, Sound, sounds);
wrap_shared_vec_as_python_list!(Musics, Music, musics);

#[pyfunction]
fn __getattr__(py: Python, name: &str) -> PyResult<PyObject> {
    let value = match name {
        // System
        "width" => val_to_pyobj!(py, pyxel().width),
        "height" => val_to_pyobj!(py, pyxel().height),
        "frame_count" => val_to_pyobj!(py, pyxel().frame_count),

        // Input
        "mouse_x" => val_to_pyobj!(py, pyxel().mouse_x),
        "mouse_y" => val_to_pyobj!(py, pyxel().mouse_y),
        "mouse_wheel" => val_to_pyobj!(py, pyxel().mouse_wheel),
        "input_text" => val_to_pyobj!(py, pyxel().input_text.clone()),
        "dropped_files" => val_to_pyobj!(py, pyxel().dropped_files.clone()),

        // Graphics
        "colors" => ins_to_pyobj!(py, Colors::wrap(0)),
        "images" => ins_to_pyobj!(py, Images::wrap(0)),
        "tilemaps" => ins_to_pyobj!(py, Tilemaps::wrap(0)),
        "screen" => ins_to_pyobj!(py, Image::wrap(pyxel().screen.clone())),
        "cursor" => ins_to_pyobj!(py, Image::wrap(pyxel().cursor.clone())),
        "font" => ins_to_pyobj!(py, Image::wrap(pyxel().font.clone())),

        // Audio
        "channels" => ins_to_pyobj!(py, Channels::wrap(0)),
        "tones" => ins_to_pyobj!(py, Tones::wrap(0)),
        "sounds" => ins_to_pyobj!(py, Sounds::wrap(0)),
        "musics" => ins_to_pyobj!(py, Musics::wrap(0)),

        // Others
        _ => {
            return Err(PyAttributeError::new_err(format!(
                "module 'pyxel' has no attribute '{name}'"
            )))
        }
    };
    Ok(value)
}

pub fn add_module_variables(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<Colors>()?;
    m.add_function(wrap_pyfunction!(__getattr__, m)?)?;
    Ok(())
}
