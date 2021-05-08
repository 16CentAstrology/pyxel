use sdl2::event::Event;
use sdl2::keyboard::Keycode;
use sdl2::pixels::Color;
use sdl2::pixels::PixelFormatEnum;
use sdl2::render::Texture as SdlTexture;
use sdl2::render::WindowCanvas as SdlCanvas;
use sdl2::EventPump as SdlEventPump;
use sdl2::Sdl as SdlContext;
use sdl2::VideoSubsystem as SdlVideoSubsystem;

use crate::canvas::Canvas;
use crate::graphics::Graphics;

pub struct System {
    sdl_context: SdlContext,
    sdl_video_subsystem: SdlVideoSubsystem,
    sdl_canvas: SdlCanvas,
    sdl_texture: SdlTexture,
    sdl_event_pump: SdlEventPump,

    screen_width: u32,
    screen_height: u32,
    window_caption: String,
    /*
        Window* window_;
        Recorder* recorder_;

        pyxelcore::PaletteColor palette_color_;
        int32_t quit_key_;
        int32_t fps_;
        int32_t frame_count_;
        double one_frame_time_;
        double next_update_time_;
        std::string drop_file_;
        bool is_loop_running_;
        bool is_quit_requested_;
        bool is_update_suspended_;

        Profiler fps_profiler_;
        Profiler update_profiler_;
        Profiler draw_profiler_;
        bool is_performance_monitor_on_;
    */
}

impl System {
    pub fn new(width: u32, height: u32, caption: Option<&str>) -> System {
        let caption = caption.unwrap_or("Pyxel");

        let sdl_context = sdl2::init().unwrap();
        let sdl_video_subsystem = sdl_context.video().unwrap();
        let sdl_window = sdl_video_subsystem
            .window(caption, width, height)
            .position_centered()
            .build()
            .unwrap();
        let sdl_canvas = sdl_window.into_canvas().build().unwrap();
        let sdl_event_pump = sdl_context.event_pump().unwrap();
        let sdl_texture_creator = sdl_canvas.texture_creator();
        let sdl_texture = sdl_texture_creator
            .create_texture_streaming(PixelFormatEnum::RGB24, width, height)
            .unwrap();

        System {
            sdl_context: sdl_context,
            sdl_video_subsystem: sdl_video_subsystem,
            sdl_canvas: sdl_canvas,
            sdl_texture: sdl_texture,
            sdl_event_pump: sdl_event_pump,

            screen_width: width,
            screen_height: height,
            window_caption: caption.to_string(),
        }

        /*
          if (screen_scale_ <= 0) {
            SDL_DisplayMode display_mode;
            SDL_GetDesktopDisplayMode(0, &display_mode);

            screen_scale_ = Max(
                Min(display_mode.w / screen_width_, display_mode.h / screen_height_) *
                    MAX_WINDOW_SIZE_RATIO,
                1.0f);
          }

          int32_t window_width = screen_width_ * screen_scale_;
          int32_t window_height = screen_height_ * screen_scale_;

          window_ = SDL_CreateWindow(caption.c_str(), SDL_WINDOWPOS_CENTERED,
                                     SDL_WINDOWPOS_CENTERED, window_width,
                                     window_height, SDL_WINDOW_RESIZABLE);

          SDL_SetWindowMinimumSize(window_, screen_width_, screen_height_);

          SetupWindowIcon();
          UpdateWindowInfo();
        */
    }

    #[inline]
    pub fn width(&self) -> u32 {
        self.screen_width
    }

    #[inline]
    pub fn height(&self) -> u32 {
        self.screen_height
    }

    #[inline]
    pub fn get_caption(&self) -> &String {
        &self.window_caption
    }

    #[inline]
    pub fn set_caption(&mut self, caption: &str) {
        self.window_caption = caption.to_string();
    }

    pub fn is_fullscreen(&self) -> bool {
        true
    }

    pub fn set_fullscreen(&self, is_fullscreen: bool) {
        //
    }

    pub fn run(&mut self, graphics: &Graphics) {
        let palette = graphics.screen().palette();
        let data = graphics.screen().data();
        let width = self.screen_width as usize;
        let height = self.screen_height as usize;

        self.sdl_texture
            .with_lock(None, |buffer: &mut [u8], pitch: usize| {
                for i in 0..height {
                    for j in 0..width {
                        let c = palette.get_display_color(data[i][j]);
                        let offset = i * pitch + j * 3;

                        buffer[offset] = ((c >> 16) & 0xff) as u8;
                        buffer[offset + 1] = ((c >> 8) & 0xff) as u8;
                        buffer[offset + 2] = (c & 0xff) as u8;
                    }
                }
            })
            .unwrap();

        'main_loop: loop {
            self.sdl_canvas.set_draw_color(Color::RGB(200, 200, 200));
            self.sdl_canvas.clear();

            self.sdl_canvas
                .copy(&self.sdl_texture, None, None)
                .expect("Render failed");

            //canvas.copy(&texture, None, Some(Rect::new(100, 100, 256, 256)))?;
            /*canvas.copy_ex(
                &texture,
                None,
                Some(Rect::new(450, 100, 256, 256)),
                30.0,
                None,
                false,
                false,
            )?;
            */

            self.sdl_canvas.present();

            for event in self.sdl_event_pump.poll_iter() {
                match event {
                    Event::Quit { .. }
                    | Event::KeyDown {
                        keycode: Some(Keycode::Escape),
                        ..
                    } => break 'main_loop,
                    _ => {}
                }
            }

            //thread::sleep(Duration::new(0, 1_000_000_000u32 / 60));}
        }
    }

    /*
        System(int32_t width,
        int32_t height,
        const std::string& caption,
        int32_t scale,
        const pyxelcore::PaletteColor& palette_color,
        int32_t fps,
        int32_t quit_key,
        bool is_fullscreen);
        ~System();

        int32_t Width() const { return window_->ScreenWidth(); }
        int32_t Height() const { return window_->ScreenHeight(); }
        int32_t FrameCount() const { return frame_count_; }

        void Run(void (*update)(), void (*draw)());
        bool Quit();
        bool FlipScreen();
        void ShowScreen();

        std::string DropFile() const { return drop_file_; }
        void SetCaption(const std::string& caption);

    private:
        int32_t WaitForUpdateTime();
        bool UpdateFrame(void (*update)());
        void CheckSpecialInput();
        void DrawFrame(void (*draw)(), int32_t update_frame_count);
        void DrawPerformanceMonitor();
        void DrawMouseCursor();
    */
}

#[cfg(test)]
mod tests {
    //
}
