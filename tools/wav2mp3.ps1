# フォルダの WAV を MP3（モノラル 22kHz 48kbps）に する。Windows の きのう だけで うごく
# つかいかた: powershell -ExecutionPolicy Bypass -File tools\wav2mp3.ps1 -In <wavフォルダ> -Out voice
param([string]$In, [string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$ext = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTaskOp = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskActP = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' })[0]
function Await($op, [Type]$t) { $task = $asTaskOp.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
function AwaitActP($op, [Type]$t) { $task = $asTaskActP.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null }
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Transcoding.MediaTranscoder, Windows.Media.Transcoding, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime] | Out-Null

$outDir = (New-Item -ItemType Directory -Force $Out).FullName
$folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($outDir)) ([Windows.Storage.StorageFolder])
$profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp3([Windows.Media.MediaProperties.AudioEncodingQuality]::Medium)
$profile.Audio.ChannelCount = 1; $profile.Audio.SampleRate = 22050; $profile.Audio.Bitrate = 48000
$tc = New-Object Windows.Media.Transcoding.MediaTranscoder
$n = 0
foreach ($w in Get-ChildItem (Join-Path $In '*.wav')) {
  $src = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($w.FullName)) ([Windows.Storage.StorageFile])
  $dst = Await ($folder.CreateFileAsync($w.BaseName + '.mp3', [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
  $prep = Await ($tc.PrepareFileTranscodeAsync($src, $dst, $profile)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
  if (-not $prep.CanTranscode) { throw "cannot transcode $($w.Name): $($prep.FailureReason)" }
  AwaitActP ($prep.TranscodeAsync()) ([double])
  $n++
}
"mp3: $n"
