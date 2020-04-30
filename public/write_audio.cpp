/*
** Copyright (C) 1999-2012 Erik de Castro Lopo <erikd@mega-nerd.com>
**
** All rights reserved.
**
** Redistribution and use in source and binary forms, with or without
** modification, are permitted provided that the following conditions are
** met:
**
**     * Redistributions of source code must retain the above copyright
**       notice, this list of conditions and the following disclaimer.
**     * Redistributions in binary form must reproduce the above copyright
**       notice, this list of conditions and the following disclaimer in
**       the documentation and/or other materials provided with the
**       distribution.
**     * Neither the author nor the names of any contributors may be used
**       to endorse or promote products derived from this software without
**       specific prior written permission.
**
** THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
** "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
** TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
** PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
** CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
** EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
** PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
** OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
** WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
** OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
** ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

#include <sndfile.h>
#include <string>
using namespace std;

#ifndef M_PI
#define M_PI 3.14159265358979323846264338
#endif

int sample_rate = 44100;
int sample_count;

SNDFILE *file;
SF_INFO sfinfo;
float *buffer;

bool write_file(string name)
{
   printf("trying to write file: %s\n", name.c_str());
   if (!(file = sf_open(name.c_str(), SFM_WRITE, &sfinfo)))
   {
      printf("Error : Not able to open output file.\n");
      return false;
   }

   if (sf_write_float(file, buffer, sfinfo.channels * sample_count) != sfinfo.channels * sample_count)
   {
      puts(sf_strerror(file));
      return false;
   }

   sf_close(file);

   return true;
}

bool generate_harmonic(int harmonic)
{
   double two_pi=2.0 * (double)M_PI;
   double freq = 440.0;
   double inc = freq * (double)harmonic * two_pi / (double)sample_rate;
   double phase = 0; //((double)rand() / RAND_MAX) * two_pi;
   printf("setting initial phase to: %f\n",phase); 
   
   double newFreq = freq * (double)harmonic;
   double halfFreq = (double)sample_rate / 2.0;

   if (newFreq > halfFreq)
      return false;

   
   for (int i = 0; i < sample_count; i++)
   {
      double ramp_val=1.0;
      double ratio=(double)i/(double)sample_count;
      if(ratio<0.25)
      {
         ramp_val=ratio/0.25; //0 to 1
      }
      if(ratio>0.75)
      {
         ramp_val=(1.0-ratio)/0.25;
      }
      buffer[i]+= ((sin(phase) / (double)harmonic)*0.5)*ramp_val;
      phase += inc;

      while(phase>two_pi)
          phase-=two_pi;
   }
   return true;
}

int main(void)
{
   printf("starting up write_audio!\n");
   srand (time(NULL)); 
   sample_count = ((int)((float)sample_rate * 0.200f));

   memset(&sfinfo, 0, sizeof(sfinfo));

   sfinfo.samplerate = sample_rate;
   sfinfo.frames = sample_count;
   sfinfo.channels = 1;
   sfinfo.format = (SF_FORMAT_WAV | SF_FORMAT_PCM_16);

   buffer = new float[sfinfo.channels * sample_count];
   if (buffer == nullptr)
   {
      printf("Error : Malloc failed.\n");
      return 1;
   }

   for (int i = 0; i < sample_count; i++)
      buffer[i] = 0;

   for (int h = 1;; h++)
   {
      printf("generating harmonic: %d\n",h);
      if (generate_harmonic(h)==false)
         return -1;

      if(write_file("saw_"+std::to_string(h)+".wav")==false)
         return -1;
   }

   return 0;
}
