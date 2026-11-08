# こえの ファイルを つくる（Windows の 日本語 音声合成 → MP3）
# つかいかた: powershell -ExecutionPolicy Bypass -File tools\make-voice.ps1 -List phrases.json -Out voice
param([string]$List, [string]$Out, [string]$Voice = 'Haruka', [double]$Pitch = 1.25, [double]$Rate = 0.95)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$ext = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTaskOp = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskActP = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' })[0]
function Await($op, [Type]$t) { $task = $asTaskOp.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
function AwaitActP($op, [Type]$t) { $task = $asTaskActP.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null }

[Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Transcoding.MediaTranscoder, Windows.Media.Transcoding, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime] | Out-Null

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*$Voice*" -and $_.Language -eq 'ja-JP' } | Select-Object -First 1
if (-not $v) { throw "voice $Voice not found" }
$synth.Voice = $v
$synth.Options.AudioPitch = $Pitch
$synth.Options.SpeakingRate = $Rate

$outDir = (New-Item -ItemType Directory -Force $Out).FullName
$tmpDir = (New-Item -ItemType Directory -Force (Join-Path $env:TEMP 'asobou-voice')).FullName
$folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($outDir)) ([Windows.Storage.StorageFolder])
$profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp3([Windows.Media.MediaProperties.AudioEncodingQuality]::Medium)
$profile.Audio.ChannelCount = 1; $profile.Audio.SampleRate = 22050; $profile.Audio.Bitrate = 48000
$tc = New-Object Windows.Media.Transcoding.MediaTranscoder

$items = Get-Content -Raw -Encoding UTF8 $List | ConvertFrom-Json
$n = 0
foreach ($it in $items) {
  $mp3 = Join-Path $outDir ($it.id + '.mp3')
  if (Test-Path $mp3) { continue }
  $wav = Join-Path $tmpDir ($it.id + '.wav')
  $st = Await ($synth.SynthesizeTextToStreamAsync($it.text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $rs = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($st)
  $fs = [IO.File]::Create($wav); $rs.CopyTo($fs); $fs.Close(); $rs.Close()
  $src = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($wav)) ([Windows.Storage.StorageFile])
  $dst = Await ($folder.CreateFileAsync($it.id + '.mp3', [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
  $prep = Await ($tc.PrepareFileTranscodeAsync($src, $dst, $profile)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
  if (-not $prep.CanTranscode) { throw "cannot transcode: $($prep.FailureReason)" }
  AwaitActP ($prep.TranscodeAsync()) ([double])
  Remove-Item $wav
  $n++
}
"made $n files"
