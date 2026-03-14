namespace AL_ActionImage_Viewer.ImageInformationProvider.Test.Unit.Helpers;

/// <summary>
/// A write-only stream that throws <see cref="IOException"/> on every write operation.
/// Used to simulate a broken pipe / closed stream in tests.
/// </summary>
public sealed class ThrowingStream : Stream
{
    public override bool CanRead => false;
    public override bool CanSeek => false;
    public override bool CanWrite => true;
    public override long Length => throw new NotSupportedException();
    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    public override void Flush() { }

    public override void Write(byte[] buffer, int offset, int count)
        => throw new IOException("Simulated broken pipe.");

    public override void WriteByte(byte value)
        => throw new IOException("Simulated broken pipe.");

    public override int Read(byte[] buffer, int offset, int count)
        => throw new NotSupportedException();

    public override long Seek(long offset, SeekOrigin origin)
        => throw new NotSupportedException();

    public override void SetLength(long value)
        => throw new NotSupportedException();
}
